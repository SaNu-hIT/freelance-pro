import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CorrectionsService,
  MAX_SCREENSHOT_BYTES,
} from './corrections.service';
import {
  CreateCorrectionCommentDto,
  CreateCorrectionDto,
  ListCorrectionsQuery,
  UpdateCorrectionDto,
} from './correction.dto';

// Role checks live in CorrectionsService, next to the project access check
@UseGuards(JwtAuthGuard)
@Controller('corrections')
export class CorrectionsController {
  constructor(private corrections: CorrectionsService) {}

  @Get()
  list(@Request() req: any, @Query() query: ListCorrectionsQuery) {
    return this.corrections.list(req.user, query);
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateCorrectionDto) {
    return this.corrections.create(req.user, dto);
  }

  @Delete('comments/:commentId')
  removeComment(
    @Request() req: any,
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ) {
    return this.corrections.removeComment(req.user, commentId);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.corrections.findOne(req.user, id);
  }

  @Patch(':id')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCorrectionDto,
  ) {
    return this.corrections.update(req.user, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.corrections.remove(req.user, id);
  }

  @Post(':id/comments')
  addComment(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCorrectionCommentDto,
  ) {
    return this.corrections.addComment(req.user, id, dto);
  }

  @Post(':id/screenshots')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_SCREENSHOT_BYTES } }),
  )
  addScreenshot(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.corrections.addScreenshot(req.user, id, file);
  }
}
