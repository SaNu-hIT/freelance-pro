import { Controller, Post, Get, Patch, Body, Param, UseGuards } from '@nestjs/common'
import { InquiriesService } from './inquiries.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CreateInquiryDto, UpdateInquiryStatusDto } from './inquiry.dto'

@Controller('inquiries')
export class InquiriesController {
  constructor(private readonly service: InquiriesService) {}

  // Public form: only the listed fields are accepted, so visitors cannot set status or ids
  @Post()
  create(@Body() body: CreateInquiryDto) {
    return this.service.create(body)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  findAll() {
    return this.service.findAll()
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: UpdateInquiryStatusDto) {
    return this.service.updateStatus(id, body.status)
  }
}
