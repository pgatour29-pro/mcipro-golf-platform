// What blocked people in one run, ranked: tried-to-write first, then by how many later steps were
// lost. Each issue has a stable key (kind | persona | what) so Admin → Test can follow the same
// issue from run to run — first seen, still open, cleared. Used by run.mjs (report) and
// publish.mjs (older runs filed before keys existed).
export function issuesFrom(results) {
    const out = [];
    for (const r of results) {
        if (r.skipped) continue;
        const steps = r.steps || [];
        const firstFail = steps.find((s) => !s.ok && !s.skipped);
        const reached = steps.filter((s) => !s.skipped).length;
        if (firstFail) out.push({ key: `step|${r.id}|${firstFail.name}`, kind: 'step', persona: r.id, who: r.title, step: firstFail.name, note: firstFail.note, shot: firstFail.shot, lost: steps.length - reached });
        if (r.fatal) out.push({ key: `fatal|${r.id}`, kind: 'fatal', persona: r.id, who: r.title, step: 'the run crashed', note: r.fatal, shot: '', lost: steps.filter((s) => s.skipped).length });
        const seenW = new Map();
        for (const b of (r.blocked || [])) { const k = b.m + ' ' + b.url.replace(/\?.*$/, ''); seenW.set(k, (seenW.get(k) || 0) + 1); }
        for (const [k, n] of seenW) out.push({ key: `guard|${r.id}|${k}`, kind: 'guard', persona: r.id, who: r.title, step: 'tried to WRITE live data', note: `${k}${n > 1 ? ` (${n}×)` : ''}`, shot: '', lost: 0 });
        for (const l of (r.lint || [])) out.push({ key: `lint|${r.id}|${l.kind}|${l.where}|${l.text}`, kind: 'lint', persona: r.id, who: r.title, step: l.kind, note: `${l.where}: "${l.text}" (seen at: ${l.step})`, shot: '', lost: 0 });
    }
    return out.sort((a, b) => (b.kind === 'guard' ? 1 : 0) - (a.kind === 'guard' ? 1 : 0) || b.lost - a.lost);
}

// a persona is stuck when a step (or the run itself) failed — warnings (guard, lint) do not count
export const isStuck = (issue) => issue.kind === 'step' || issue.kind === 'fatal';
