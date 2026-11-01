export { AnimalWriteService } from './AnimalWriteService.ts';
export { createAnimalHttpHandler } from './http.ts';
export { validateAnimalWrite } from './validation.ts';
export type { AnimalRepository, AnimalTransaction } from './repository.ts';
import { AnimalWriteService } from './AnimalWriteService.ts';
import type { AnimalRepository, AnimalTransaction } from './repository.ts';

/** C/D use the SAME durable transaction for pinned job/row outcomes/checkpoints
 * and the writer's identity/CAS/receipt changes. Outer caller controls commit.
 * Never start an independent nested DB transaction inside this callback.
 */
export function withAnimalTransaction<T>(repository: AnimalRepository, run: (writer: AnimalWriteService, tx: AnimalTransaction) => Promise<T>): Promise<T> {
  return repository.transaction(tx => run(new AnimalWriteService({ transaction: operation => operation(tx) }), tx));
}
