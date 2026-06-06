package queue

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/service/sqs"
	"github.com/rshdhere/video-transcoding-pipeline/apps/workers/internal/awscfg"
	"github.com/rshdhere/video-transcoding-pipeline/apps/workers/internal/config"
	"github.com/rshdhere/video-transcoding-pipeline/apps/workers/internal/job"
)

type ReceivedMessage struct {
	MessageID     string
	ReceiptHandle string
	Body          job.QueueMessage
}

type Client struct {
	sqs        *sqs.Client
	queueURL   string
	visibility int32
}

func NewTranscodeClient(cfg config.Config) (*Client, error) {
	return newClient(cfg, cfg.SQSTranscodeURL)
}

func NewEmailClient(cfg config.Config) (*Client, error) {
	return newClient(cfg, cfg.SQSEmailURL)
}

func newClient(cfg config.Config, queueURL string) (*Client, error) {
	if queueURL == "" {
		return nil, fmt.Errorf("queue url is required")
	}

	awsCfg, err := awscfg.Load(context.Background(), cfg)
	if err != nil {
		return nil, fmt.Errorf("load aws config: %w", err)
	}

	client := sqs.NewFromConfig(awsCfg, func(options *sqs.Options) {
		if cfg.SQSEndpoint != "" {
			options.BaseEndpoint = &cfg.SQSEndpoint
		}
	})

	return &Client{
		sqs:        client,
		queueURL:   queueURL,
		visibility: 900,
	}, nil
}

func (c *Client) Receive(ctx context.Context) (*ReceivedMessage, error) {
	output, err := c.sqs.ReceiveMessage(ctx, &sqs.ReceiveMessageInput{
		QueueUrl:            &c.queueURL,
		MaxNumberOfMessages: 1,
		WaitTimeSeconds:     20,
		VisibilityTimeout:   c.visibility,
	})
	if err != nil {
		return nil, err
	}

	if len(output.Messages) == 0 {
		return nil, nil
	}

	message := output.Messages[0]
	if message.Body == nil || message.ReceiptHandle == nil || message.MessageId == nil {
		return nil, fmt.Errorf("received incomplete sqs message")
	}

	var body job.QueueMessage
	if err := json.Unmarshal([]byte(*message.Body), &body); err != nil {
		return nil, fmt.Errorf("decode sqs message: %w", err)
	}

	return &ReceivedMessage{
		MessageID:     *message.MessageId,
		ReceiptHandle: *message.ReceiptHandle,
		Body:          body,
	}, nil
}

func (c *Client) Delete(ctx context.Context, receiptHandle string) error {
	_, err := c.sqs.DeleteMessage(ctx, &sqs.DeleteMessageInput{
		QueueUrl:      &c.queueURL,
		ReceiptHandle: &receiptHandle,
	})

	return err
}

func (c *Client) Release(ctx context.Context, receiptHandle string) error {
	_, err := c.sqs.ChangeMessageVisibility(ctx, &sqs.ChangeMessageVisibilityInput{
		QueueUrl:          &c.queueURL,
		ReceiptHandle:     &receiptHandle,
		VisibilityTimeout: 0,
	})

	return err
}
