import { Controller, Post, Get, Patch, Body, Param, UseGuards } from '@nestjs/common'
import { InquiriesService } from './inquiries.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('inquiries')
export class InquiriesController {
  constructor(private readonly service: InquiriesService) {}

  @Post()
  create(@Body() body: any) {
    return this.service.create(body)
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.service.findAll()
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.service.updateStatus(id, status)
  }
}
