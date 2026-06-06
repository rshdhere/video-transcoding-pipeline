package awscfg

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"

	"github.com/rshdhere/video-transcoding-pipeline/apps/workers/internal/config"
)

// Load returns AWS SDK config using explicit credentials when both access key
// and secret are set, otherwise the default credential chain.
func Load(ctx context.Context, cfg config.Config) (aws.Config, error) {
	opts := []func(*awsconfig.LoadOptions) error{
		awsconfig.WithRegion(cfg.AWSRegion),
	}

	if cfg.AWSAccessKeyID != "" && cfg.AWSSecretAccessKey != "" {
		opts = append(opts, awsconfig.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(
				cfg.AWSAccessKeyID,
				cfg.AWSSecretAccessKey,
				"",
			),
		))
	}

	return awsconfig.LoadDefaultConfig(ctx, opts...)
}
