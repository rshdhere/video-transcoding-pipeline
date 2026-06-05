package email

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type Sender struct {
	apiKey  string
	from    string
	enabled bool
	client  *http.Client
}

func NewSender(apiKey, from string, enabled bool) *Sender {
	return &Sender{
		apiKey:  apiKey,
		from:    from,
		enabled: enabled,
		client: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

type sendRequest struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
	Text    string   `json:"text"`
}

func (s *Sender) SendVerification(ctx context.Context, to, verificationURL string) error {
	if !s.enabled {
		return nil
	}

	if s.apiKey == "" {
		return fmt.Errorf("resend api key is required when mail is enabled")
	}

	body := sendRequest{
		From:    s.from,
		To:      []string{to},
		Subject: "Verify your email address",
		HTML: fmt.Sprintf(
			`<p>Thanks for signing up. Please verify your email address by clicking the link below:</p><p><a href="%s">Verify email</a></p>`,
			verificationURL,
		),
		Text: fmt.Sprintf("Verify your email address by visiting: %s", verificationURL),
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		"https://api.resend.com/emails",
		bytes.NewReader(payload),
	)
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	response, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	if response.StatusCode >= 300 {
		return fmt.Errorf("resend returned status %d", response.StatusCode)
	}

	return nil
}
