package storage

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"github.com/aws/aws-sdk-go-v2/feature/s3/manager"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/smithy-go"

	"github.com/rshdhere/video-transcoding-pipeline/apps/workers/internal/awscfg"
	"github.com/rshdhere/video-transcoding-pipeline/apps/workers/internal/config"
)

type Client struct {
	s3     *s3.Client
	down   *manager.Downloader
	upload *manager.Uploader
}

func New(cfg config.Config) (*Client, error) {
	awsCfg, err := awscfg.Load(context.Background(), cfg)
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

func (c *Client) ObjectExists(ctx context.Context, bucket, key string) (bool, error) {
	_, err := c.s3.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: &bucket,
		Key:    &key,
	})
	if err == nil {
		return true, nil
	}

	if isS3NotFound(err) {
		return false, nil
	}

	return false, err
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

func isS3NotFound(err error) bool {
	var apiErr smithy.APIError
	if errors.As(err, &apiErr) {
		switch apiErr.ErrorCode() {
		case "NotFound", "NoSuchKey", "404":
			return true
		}
	}

	return false
}

func (c *Client) ListKeys(ctx context.Context, bucket, prefix string) ([]string, error) {
	var keys []string
	var continuation *string

	for {
		output, err := c.s3.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
			Bucket:            &bucket,
			Prefix:            &prefix,
			ContinuationToken: continuation,
		})
		if err != nil {
			return nil, err
		}

		for _, object := range output.Contents {
			if object.Key != nil {
				keys = append(keys, *object.Key)
			}
		}

		if output.IsTruncated == nil || !*output.IsTruncated {
			break
		}
		continuation = output.NextContinuationToken
	}

	return keys, nil
}

func FileSize(path string) (int64, error) {
	info, err := os.Stat(path)
	if err != nil {
		return 0, err
	}

	return info.Size(), nil
}
