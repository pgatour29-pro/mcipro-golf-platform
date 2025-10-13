resource "aws_security_group" "rds" {
  name        = "${var.project}-rds-sg"
  description = "RDS security group"
  vpc_id      = var.vpc_id
}

resource "aws_rds_cluster" "chat" {
  cluster_identifier      = "${var.project}-aurora"
  engine                  = "aurora-postgresql"
  engine_version          = "14.9"
  master_username         = var.db_username
  master_password         = var.db_password
  database_name           = "chatdb"
  backup_retention_period = 1
  preferred_backup_window = "02:00-03:00"
  db_subnet_group_name    = aws_db_subnet_group.chat.name
  vpc_security_group_ids  = [aws_security_group.rds.id]
}

resource "aws_rds_cluster_instance" "chat" {
  count                = 1
  cluster_identifier   = aws_rds_cluster.chat.id
  instance_class       = "db.t4g.medium"
  engine               = aws_rds_cluster.chat.engine
  engine_version       = aws_rds_cluster.chat.engine_version
  publicly_accessible  = false
}

resource "aws_db_subnet_group" "chat" {
  name       = "${var.project}-db-subnets"
  subnet_ids = var.private_subnet_ids
}

output "rds_endpoint" { value = aws_rds_cluster.chat.endpoint }
output "rds_reader_endpoint" { value = aws_rds_cluster.chat.reader_endpoint }
