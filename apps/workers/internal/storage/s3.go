package storage

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/feature/s3/manager"
	"github.com/aws/aws-sdk-go-v2/service/s3"

	"github.com/rshdhere/video-transcoding-pipeline/apps/workers/internal/config"
)

type Client struct {
	s3     *s3.Client
	down   *manager.Downloader
	upload *manager.Uploader
}

func New(cfg config.Config) (*Client, error) {
	awsCfg, err := awsconfig.LoadDefaultConfig(
		context.Background(),
		awsconfig.WithRegion(cfg.AWSRegion),
		awsconfig.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(
				cfg.AWSAccessKeyID,
				cfg.AWSSecretAccessKey,
				"",
			),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("load aws config: %w", err)
	}

	client := s3.NewFromConfig(awsCfg, func(options *s3.Options) {
		if cfg.S3Endpoint != "" {
			options.BaseEndpoint = &cfg.S3Endpoint
		}
		options.UsePathStyle = cfg.S3ForcePathStyle
	})

	return &Client{
		s3:     client,
		down:   manager.NewDownloader(client),
		upload: manager.NewUploader(client),
	}, nil
}

func (c *Client) Download(ctx context.Context, bucket, key, destinationPath string) error {
	if err := os.MkdirAll(filepath.Dir(destinationPath), 0o755); err != nil {
		return err
	}

	file, err := os.Create(destinationPath)
	if err != nil {
		return err
	}
	defer file.Close()

	_, err = c.down.Download(ctx, file, &s3.GetObjectInput{
		Bucket: &bucket,
		Key:    &key,
	})

	return err
}

func (c *Client) Upload(ctx context.Context, bucket, key, sourcePath, contentType string) error {
	file, err := os.Open(sourcePath)
	if err != nil {
		return err
	}
	defer file.Close()

	_, err = c.upload.Upload(ctx, &s3.PutObjectInput{
		Bucket:      &bucket,
		Key:         &key,
		Body:        file,
		ContentType: &contentType,
	})

	return err
}

func FileSize(path string) (int64, error) {
	info, err := os.Stat(path)
	if err != nil {
		return 0, err
	}

	return info.Size(), nil
}
