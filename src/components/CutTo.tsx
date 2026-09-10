import { motion, AnimatePresence } from 'framer-motion';

export interface CutSpec {
  label: string;
  scene: string;
}

const WIPE = [0.72, 0, 0.18, 1] as const;

/**
 * The film-cut transition: a black leader wipes across, holds a beat with a
 * mono "CUT TO:" slate (plus a flash frame, like a splice), then wipes off
 * to reveal the freshly mounted view. The actual view swap happens under
 * the cover — no reload, no jank.
 */
export default function CutTo({ cut }: { cut: CutSpec | null }) {
  return (
    <AnimatePresence>
      {cut && (
        <motion.div key="cut" className="chrome-orig pointer-events-none fixed inset-0 z-[85]">
          {/* black leader */}
          <motion.div
            className="absolute inset-0 bg-black"
            initial={{ clipPath: 'inset(0 100% 0 0)' }}
            animate={{ clipPath: 'inset(0 0% 0 0)' }}
            exit={{ clipPath: 'inset(0 0 0 100%)' }}
            transition={{ duration: 0.34, ease: WIPE }}
          />
          {/* splice flash */}
          <motion.div
            className="absolute inset-0 bg-bone"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 0.85, 0] }}
            transition={{ duration: 0.5, times: [0, 0.55, 0.62, 0.75], ease: 'linear' }}
          />
          {/* slate */}
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, delay: 0.2 }}
          >
            <div className="font-tele text-[11px] tracking-[0.5em] text-blood">CUT TO:</div>
            <div className="font-display text-5xl uppercase tracking-wide text-bone sm:text-7xl">
              {cut.label}
            </div>
            <div className="mt-4 flex items-center gap-6 font-tele text-[10px] tracking-[0.25em] text-dim">
              <span>{cut.scene}</span>
              <span className="text-blood">TC 00:00:07:14</span>
              <span>24 FPS</span>
            </div>
          </motion.div>
          {/* red edge lines */}
          <motion.div
            className="absolute inset-x-0 top-[12%] h-px bg-blood/60"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ scaleX: 0 }}
            transition={{ duration: 0.3, delay: 0.18 }}
          />
          <motion.div
            className="absolute inset-x-0 bottom-[12%] h-px bg-blood/60"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ scaleX: 0 }}
            transition={{ duration: 0.3, delay: 0.22 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
