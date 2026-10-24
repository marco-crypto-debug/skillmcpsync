import pc from 'picocolors';

export const logger = {
  info: (msg: string) => console.log(pc.cyan('ℹ ') + msg),
  success: (msg: string) => console.log(pc.green('✔ ') + pc.bold(msg)),
  warn: (msg: string) => console.log(pc.yellow('⚠ ') + pc.yellow(msg)),
  error: (msg: string) => console.error(pc.red('✖ ') + pc.bold(pc.red(msg))),
  step: (step: number, total: number, msg: string) =>
    console.log(pc.dim(`[${step}/${total}] `) + pc.cyan(msg)),
  dim: (msg: string) => console.log(pc.dim(msg)),
  bold: (msg: string) => console.log(pc.bold(msg)),
  header: (title: string) => {
    console.log('\n' + pc.bold(pc.cyan('=== ' + title + ' ===')));
  },
  divider: () => console.log(pc.dim('─'.repeat(50))),
};
