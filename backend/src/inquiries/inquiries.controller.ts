import { Controller, Post, Get, Patch, Body, Param, UseGuards } from '@nestjs/common'
import { InquiriesService } from './inquiries.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'

@Controller('inquiries')
export class InquiriesController {
  constructor(private readonly service: InquiriesService) {}

  @Post()
  create(@Body() body: any) {
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
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.service.updateStatus(id, status)
  }
}
