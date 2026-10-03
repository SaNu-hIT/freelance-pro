import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { InquiriesController } from '../inquiries/inquiries.controller';
import { SkillGroupsController } from '../skill-groups/skill-groups.controller';
import { SprintsController } from '../sprints/sprints.controller';
import { TasksController } from '../tasks/tasks.controller';
import { UsersController } from '../users/users.controller';

// Every route listed here must be admin-only: RolesGuard attached and @Roles('admin').
const adminOnly: [string, object, string[]][] = [
  ['InquiriesController', InquiriesController, ['findAll', 'updateStatus']],
  ['SkillGroupsController', SkillGroupsController, ['create', 'update', 'remove', 'addSkill', 'removeSkill']],
  ['SprintsController', SprintsController, ['create', 'update', 'remove']],
  ['TasksController', TasksController, ['create', 'remove']],
  ['UsersController', UsersController, ['list', 'createClient', 'createFreelancer', 'adminUpdate', 'resetPassword']],
];

describe('admin-only routes', () => {
  for (const [name, ctrl, methods] of adminOnly) {
    it.each(methods)(`${name}.%s requires admin`, method => {
      const handler = (ctrl as any).prototype[method];
      expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual(['admin']);
      expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toContain(RolesGuard);
    });
  }
});
