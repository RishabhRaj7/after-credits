import { AnimatePresence, motion } from 'framer-motion';

const WIPE = [0.72, 0, 0.18, 1] as const;

/* The film cut between projections: a black leader wipes across with a slate,
   the view swaps underneath, and the leader wipes off. */
export default function CutTo({ label }: { label: string | null }) {
  return (
    <AnimatePresence>
      {label && (
        <motion.div key="cut" className="pointer-events-none fixed inset-0 z-[85]" aria-hidden>
          <motion.div
            className="absolute inset-0 bg-ink"
            initial={{ clipPath: 'inset(0 100% 0 0)' }}
            animate={{ clipPath: 'inset(0 0% 0 0)' }}
            exit={{ clipPath: 'inset(0 0 0 100%)' }}
            transition={{ duration: 0.36, ease: WIPE }}
          />
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, delay: 0.18 }}
          >
            <div className="label text-blood">Cut to</div>
            <div className="font-display text-6xl font-extrabold uppercase text-bone sm:text-8xl">{label}</div>
            <div className="mt-2 h-px w-24 bg-blood" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
