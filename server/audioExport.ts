import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import { PassThrough } from 'stream';

export type AudioExportStatus = 'queued' | 'processing' | 'complete' | 'error';

export interface AudioExportJob {
  id: string;
  playlistUrl: string;
  status: AudioExportStatus;
  progress: number;
  currentTrack: string;
  error?: string;
  zipPath?: string;
  createdAt: number;
}

const jobs = new Map<string, AudioExportJob>();
const TMP_DIR = '/tmp/audio-forge';
const JOB_TTL = 30 * 60 * 1000; // 30분

// 오래된 작업 정리
setInterval(() => {
  const now = Date.now();
  for (const [id, job] of jobs.entries()) {
    if (now - job.createdAt > JOB_TTL) {
      if (job.zipPath) fs.remove(job.zipPath).catch(() => {});
      fs.remove(path.join(TMP_DIR, id)).catch(() => {});
      jobs.delete(id);
    }
  }
}, 60_000);

export const audioExport = {
  start: async (playlistUrl: string): Promise<{ jobId: string }> => {
    // 간단한 URL 검증
    if (!playlistUrl.includes('youtube.com/playlist') && !playlistUrl.includes('youtu.be')) {
      throw new Error('유튜브 재생목록 URL이 아닙니다.');
    }

    const jobId = uuidv4();
    const outputDir = path.join(TMP_DIR, jobId);
    await fs.ensureDir(outputDir);

    const job: AudioExportJob = {
      id: jobId,
      playlistUrl,
      status: 'queued',
      progress: 0,
      currentTrack: '대기 중...',
      createdAt: Date.now()
    };
    jobs.set(jobId, job);

    // 비동기로 변환 시작
    process.nextTick(() => runConversion(jobId, playlistUrl, outputDir));

    return { jobId };
  },

  status: (jobId: string): Partial<AudioExportJob> => {
    const job = jobs.get(jobId);
    if (!job) throw new Error('작업이 없거나 만료되었습니다.');
    return {
      status: job.status,
      progress: job.progress,
      currentTrack: job.currentTrack,
      error: job.error
    };
  },

  getResultPath: (jobId: string): string | null => {
    const job = jobs.get(jobId);
    if (!job || job.status !== 'complete') return null;
    return job.zipPath || null;
  }
};

async function runConversion(jobId: string, playlistUrl: string, outputDir: string) {
  const job = jobs.get(jobId)!;
  job.status = 'processing';
  job.progress = 5;
  job.currentTrack = 'yt-dlp 준비 중...';

  try {
    // === 핵심: 차단 회피 옵션 전부 포함 ===
    const args = [
      playlistUrl,

      // ✅ 차단 회피 설정
      '--update-to', 'nightly',
      '--force-ipv4',
      '--sleep-requests', '2',
      '--sleep-interval', '3',
      '--max-sleep-interval', '8',
      '--limit-rate', '2M',
      '--retries', '5',
      '--retry-sleep', 'linear=3:15:2',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',

      // ✅ 쿠키 사용 (cookies.txt 파일이 있을 때만 유효)
      '--cookies', path.resolve(process.cwd(), 'cookies.txt'),

      // ✅ 변환 설정
      '--yes-playlist',
      '--audio-format', 'mp3',
      '--audio-quality', '320K',
      '--embed-metadata',
      '-o', path.join(outputDir, '%(playlist_index)03d - %(title)s.%(ext)s')
    ];

    job.currentTrack = '재생목록 정보 읽는 중...';
    job.progress = 10;

    await new Promise<void>((resolve, reject) => {
      const proc = spawn('yt-dlp', args);
      let errorLog = '';

      proc.stderr.on('data', (data) => {
        const text = data.toString();
        errorLog += text;

        // 진행률 파싱
        const progressMatch = text.match(/(\d+\.\d+)%/);
        if (progressMatch) {
          job.progress = 10 + Math.round(parseFloat(progressMatch[1]) * 0.7);
        }
        // 현재 트랙 이름
        const titleMatch = text.match(/\[download\] Destination: (.+)\.mp3/);
        if (titleMatch) {
          job.currentTrack = path.basename(titleMatch[1]);
        }
      });

      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`yt-dlp 오류 (코드 ${code}): ${errorLog.slice(-500)}`));
      });

      proc.on('error', reject);
    });

    job.currentTrack = 'ZIP으로 묶는 중...';
    job.progress = 90;

    // ZIP으로 압축
    const zipPath = `${outputDir}.zip`;
    const files = await fs.readdir(outputDir);
    const archiver = (await import('archiver')).default;

    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 5 } });

      output.on('close', resolve);
      archive.on('error', reject);

      archive.pipe(output);
      for (const file of files) {
        archive.file(path.join(outputDir, file), { name: file });
      }
      await archive.finalize();
    });

    // 임시 폴더 정리
    await fs.remove(outputDir);

    job.status = 'complete';
    job.progress = 100;
    job.zipPath = zipPath;
    job.currentTrack = '완료! 다운로드해 주세요.';

  } catch (err) {
    job.status = 'error';
    job.error = err instanceof Error ? err.message : '알 수 없는 오류';
    job.progress = 0;
  }
}