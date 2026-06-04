package handler

import (
	"encoding/json"
	"net/http"
)

type Health struct{}

func NewHealth() *Health {
	return &Health{}
}

func (h *Health) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{
		"status":  "ok",
		"service": "api-v2",
	})
}
