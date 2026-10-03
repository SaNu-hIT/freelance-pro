import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentsService, MAX_DOCUMENT_BYTES } from './documents.service';
import { ListDocumentsQuery, UpdateDocumentDto, UploadDocumentDto } from './document.dto';

@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Get()
  list(@Request() req: any, @Query() query: ListDocumentsQuery) {
    return this.documentsService.list(req.user, query.projectId);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_DOCUMENT_BYTES } }))
  upload(@Request() req: any, @Body() dto: UploadDocumentDto, @UploadedFile() file: Express.Multer.File) {
    return this.documentsService.upload(req.user, dto, file);
  }

  @Get(':id/download')
  async download(@Request() req: any, @Param('id') id: string, @Res() res: Response) {
    const doc = await this.documentsService.download(req.user, id);
    res.set({
      'Content-Type': doc.mimeType,
      'Content-Length': String(doc.size),
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(doc.name)}`,
    });
    res.send(doc.data);
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateDocumentDto) {
    return this.documentsService.update(req.user, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.documentsService.remove(req.user, id);
  }
}
