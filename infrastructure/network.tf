locals {
  default_subnet_ids = tolist(data.aws_subnets.default.ids)
}

data "aws_subnet" "default_by_id" {
  for_each = toset(data.aws_subnets.default.ids)
  id       = each.value
}

locals {
  beanstalk_subnet_ids = [
    for subnet in data.aws_subnet.default_by_id :
    subnet.id if !contains(var.eb_excluded_azs, subnet.availability_zone)
  ]
}
