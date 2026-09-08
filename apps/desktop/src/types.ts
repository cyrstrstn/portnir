export type Listener = {
  protocol: string;
  localAddr: string;
  port: number;
  pid: number;
  processName: string;
  path?: string | null;
  company?: string | null;
};
