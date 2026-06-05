#!/usr/bin/env bash
set -euo pipefail

awslocal s3 mb s3://vtp-uploads
awslocal s3 mb s3://vtp-transcoded
awslocal sqs create-queue --queue-name vtp-transcoding
awslocal sqs create-queue --queue-name vtp-email-verification
