package handler

import (
	"encoding/json"
	"net/http"
)

type API struct{}

func NewAPI() *API {
	return &API{}
}

func (a *API) Root(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{
		"message": "video transcoding pipeline api v2",
		"version": "0.1.0",
	})
}
