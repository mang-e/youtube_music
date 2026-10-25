import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { audioExport } from '../audioExport';

const router = express.Router();

router.get('/jobs/:jobId/download', async (req, res) => {
  const { jobId } = req.params;

  try {
    const jobStatus = audioExport.status(jobId);
    
    if (jobStatus.status !== 'complete') {
      return res.status(404).send('아직 완료되지 않았거나 작업이 없습니다.');
    }

    const zipPath = audioExport.getResultPath(jobId);
    if (!zipPath || !await fs.pathExists(zipPath)) {
      return res.status(404).send('파일이 이미 삭제되었습니다.');
    }

    res.download(zipPath, `playlist-${jobId.slice(0, 8)}.zip`, (err) => {
      if (err) {
        console.error('다운로드 오류:', err);
      }
      // 다운로드 후 파일 정리
      setTimeout(() => fs.remove(zipPath).catch(() => {}), 5 * 60 * 1000);
    });

  } catch (e) {
    res.status(404).send(e instanceof Error ? e.message : '오류');
  }
});

export default router;