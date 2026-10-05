import { EntityManager } from 'typeorm';
import { Correction, CorrectionStatus } from '../entities/correction.entity';
import { CorrectionComment } from '../entities/correction-comment.entity';
import { ProjectTask } from '../entities/project-task.entity';

export const STATUS_LABEL: Record<CorrectionStatus, string> = {
  open: 'Open',
  triaged: 'Triaged',
  needs_info: 'Needs info',
  in_progress: 'In progress',
  fixed: 'Fixed',
  confirmed: 'Confirmed',
  reopened: 'Reopened',
  wontfix: "Won't fix",
};

// Statuses a task can still move forward; the client's sign-off and won't-fix are left alone
const DONE_MOVES_FROM: CorrectionStatus[] = [
  'open',
  'triaged',
  'in_progress',
  'reopened',
  'needs_info',
];
const START_MOVES_FROM: CorrectionStatus[] = ['open', 'triaged', 'reopened'];

export function logCorrectionStatus(
  m: EntityManager,
  correctionId: string,
  authorId: string | null,
  from: CorrectionStatus,
  to: CorrectionStatus,
) {
  return m.save(
    m.create(CorrectionComment, {
      correctionId,
      authorId,
      kind: 'status',
      body: `${STATUS_LABEL[from]} → ${STATUS_LABEL[to]}`,
      visibility: 'client',
    }),
  );
}

// A task marked done marks its correction fixed; a task in progress marks it in progress
export async function syncCorrectionsFromTask(
  m: EntityManager,
  task: ProjectTask,
  actorId: string | null,
): Promise<void> {
  const linked = await m.find(Correction, { where: { taskId: task.id } });
  for (const c of linked) {
    const to: CorrectionStatus | null =
      task.completed && DONE_MOVES_FROM.includes(c.status)
        ? 'fixed'
        : !task.completed &&
            task.inProgressAt &&
            START_MOVES_FROM.includes(c.status)
          ? 'in_progress'
          : null;
    if (!to) continue;
    const from = c.status;
    await m.transaction(async (tx) => {
      await tx.update(Correction, c.id, { status: to });
      await logCorrectionStatus(tx, c.id, actorId, from, to);
    });
  }
}
