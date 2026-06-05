package email

import "testing"

func TestRecipientFromPayload(t *testing.T) {
	email, err := recipientFromPayload(map[string]interface{}{
		"email": "verify@example.com",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if email != "verify@example.com" {
		t.Fatalf("expected email address, got %q", email)
	}
}

func TestRecipientFromPayloadMissingEmail(t *testing.T) {
	_, err := recipientFromPayload(map[string]interface{}{})
	if err == nil {
		t.Fatalf("expected missing email error")
	}
}
