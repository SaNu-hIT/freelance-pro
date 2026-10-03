import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, UpdatePaymentDto } from './dto/payment.dto';

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get()
  async findAll(@Request() req: any, @Query() query: any) {
    const user = req.user;
    const filters: any = {
      projectId: query.projectId,
      status: query.status,
    };

    // Payments are freelancer payouts: a freelancer sees their own, clients see none
    if (user.role === 'freelancer') {
      filters.freelancerUserId = user.id;
    } else if (user.role !== 'admin') {
      throw new ForbiddenException('Payouts are not visible to clients');
    }

    return this.paymentsService.findAll(filters);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  async create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async update(@Param('id') id: string, @Body() dto: UpdatePaymentDto) {
    return this.paymentsService.update(id, dto);
  }
}
