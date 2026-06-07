package job

type Type string

const (
	TypeTranscoding        Type = "transcoding"
	TypeEmailVerification Type = "email_verification"
)

type QueueMessage struct {
	JobID   string                 `json:"jobId"`
	Type    Type                   `json:"type"`
	UserID  string                 `json:"userId,omitempty"`
	VideoID string                 `json:"videoId,omitempty"`
	Payload map[string]interface{} `json:"payload"`
}

type Record struct {
	ID            string
	Type          Type
	Status        string
	UserID        *string
	VideoID       *string
	Payload       []byte
	ReceiptHandle *string
	Attempts      int
	MaxAttempts   int
}

type Video struct {
	ID         string
	UserID     string
	S3Bucket   string
	S3Key      string
	MimeType   string
	SourceType string
	SourceURL  *string
	Status     string
}
