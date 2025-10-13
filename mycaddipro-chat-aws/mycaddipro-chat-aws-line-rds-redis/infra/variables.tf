variable "region" { default = "ap-southeast-1" }
variable "project" { default = "mycaddipro-chat" }
variable "vpc_id"  { description = "Existing VPC ID" }
variable "private_subnet_ids" { type = list(string), description = "Private subnets for DB/Redis/ECS" }
variable "public_subnet_ids"  { type = list(string), description = "Public subnets for ALB if you add it" }
variable "db_username" { default = "chatuser" }
variable "db_password" { default = "changeme-strong-pass" }
