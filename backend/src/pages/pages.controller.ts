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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PagesService } from './pages.service';
import {
  CreatePageDto,
  CreatePageNoteDto,
  DiscoverPagesDto,
  ListPagesQuery,
  UpdatePageDto,
} from './page.dto';

// Role checks live in PagesService, next to the project access check
@UseGuards(JwtAuthGuard)
@Controller('pages')
export class PagesController {
  constructor(private pagesService: PagesService) {}

  @Get()
  list(@Request() req: any, @Query() query: ListPagesQuery) {
    return this.pagesService.list(req.user, query.projectId);
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreatePageDto) {
    return this.pagesService.create(req.user, dto);
  }

  @Post('discover')
  discover(@Request() req: any, @Body() dto: DiscoverPagesDto) {
    return this.pagesService.discover(req.user, dto.projectId, dto.url);
  }

  @Delete('notes/:noteId')
  removeNote(
    @Request() req: any,
    @Param('noteId', ParseUUIDPipe) noteId: string,
  ) {
    return this.pagesService.removeNote(req.user, noteId);
  }

  @Patch(':id')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePageDto,
  ) {
    return this.pagesService.update(req.user, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.pagesService.remove(req.user, id);
  }

  @Post(':id/notes')
  addNote(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePageNoteDto,
  ) {
    return this.pagesService.addNote(req.user, id, dto);
  }
}
