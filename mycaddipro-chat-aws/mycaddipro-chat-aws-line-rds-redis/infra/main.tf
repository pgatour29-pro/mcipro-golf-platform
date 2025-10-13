terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" { region = var.region }

# S3 bucket for attachments
resource "aws_s3_bucket" "uploads" {
  bucket        = "${var.project}-uploads"
  force_destroy = true
}

# SQS for message fanout
resource "aws_sqs_queue" "chat_messages" {
  name                      = "${var.project}-messages"
  message_retention_seconds = 345600
}

# ECR repos for services
resource "aws_ecr_repository" "chat_api" { name = "${var.project}/chat-api" }
resource "aws_ecr_repository" "chat_realtime" { name = "${var.project}/chat-realtime" }
resource "aws_ecr_repository" "fanout_worker" { name = "${var.project}/fanout-worker" }

output "s3_bucket"      { value = aws_s3_bucket.uploads.bucket }
output "sqs_queue_url"  { value = aws_sqs_queue.chat_messages.id }
output "ecr_chat_api"   { value = aws_ecr_repository.chat_api.repository_url }
output "ecr_realtime"   { value = aws_ecr_repository.chat_realtime.repository_url }
output "ecr_worker"     { value = aws_ecr_repository.fanout_worker.repository_url }
