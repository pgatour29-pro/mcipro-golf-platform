resource "aws_security_group" "redis" {
  name        = "${var.project}-redis-sg"
  description = "ElastiCache Redis SG"
  vpc_id      = var.vpc_id
}

resource "aws_elasticache_subnet_group" "chat" {
  name       = "${var.project}-redis-subnets"
  subnet_ids = var.private_subnet_ids
}

resource "aws_elasticache_cluster" "chat" {
  cluster_id           = "${var.project}-redis"
  engine               = "redis"
  node_type            = "cache.t4g.micro"
  num_cache_nodes      = 1
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.chat.name
  security_group_ids   = [aws_security_group.redis.id]
  parameter_group_name = "default.redis7"
}

output "redis_endpoint" { value = aws_elasticache_cluster.chat.cache_nodes[0].address }
