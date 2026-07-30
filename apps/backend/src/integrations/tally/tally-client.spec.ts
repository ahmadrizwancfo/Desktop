import { TallyClient } from './tally-client';
import { BadRequestException } from '@nestjs/common';

describe('TallyClient - SSRF Guard & Security Validation', () => {
  let tallyClient: TallyClient;

  beforeEach(() => {
    tallyClient = new TallyClient();
  });

  describe('validateTallyHostUrl', () => {
    it('allows valid public HTTP and HTTPS URLs', async () => {
      const result1 = await tallyClient.validateTallyHostUrl('http://tally.mycompany.com:9000');
      expect(result1.isValid).toBe(true);

      const result2 = await tallyClient.validateTallyHostUrl('https://tally-cloud.example.org/api');
      expect(result2.isValid).toBe(true);
    });

    it('rejects invalid or non-HTTP/HTTPS protocols', async () => {
      const ftp = await tallyClient.validateTallyHostUrl('ftp://tally.company.com');
      expect(ftp.isValid).toBe(false);
      expect(ftp.reason).toContain('Invalid protocol');

      const file = await tallyClient.validateTallyHostUrl('file:///etc/passwd');
      expect(file.isValid).toBe(false);
      expect(file.reason).toContain('Invalid protocol');
    });

    it('rejects loopback targets (127.0.0.1, localhost, ::1, 0.0.0.0)', async () => {
      expect((await tallyClient.validateTallyHostUrl('http://localhost:9000')).isValid).toBe(false);
      expect((await tallyClient.validateTallyHostUrl('http://127.0.0.1:9000')).isValid).toBe(false);
      expect((await tallyClient.validateTallyHostUrl('http://[::1]:9000')).isValid).toBe(false);
      expect((await tallyClient.validateTallyHostUrl('http://0.0.0.0:9000')).isValid).toBe(false);
    });

    it('rejects private IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)', async () => {
      expect((await tallyClient.validateTallyHostUrl('http://10.0.0.1:9000')).isValid).toBe(false);
      expect((await tallyClient.validateTallyHostUrl('http://10.255.0.1:9000')).isValid).toBe(false);
      expect((await tallyClient.validateTallyHostUrl('http://172.16.0.50:9000')).isValid).toBe(false);
      expect((await tallyClient.validateTallyHostUrl('http://172.31.255.1:9000')).isValid).toBe(false);
      expect((await tallyClient.validateTallyHostUrl('http://192.168.1.100:9000')).isValid).toBe(false);
    });

    it('rejects cloud metadata IP (169.254.169.254)', async () => {
      const res = await tallyClient.validateTallyHostUrl('http://169.254.169.254/latest/meta-data/');
      expect(res.isValid).toBe(false);
      expect(res.reason).toContain('Forbidden cloud metadata');
    });
  });

  describe('sendTallyXmlRequest', () => {
    it('throws BadRequestException when SSRF validation fails', async () => {
      await expect(
        tallyClient.sendTallyXmlRequest({ tallyHostUrl: 'http://169.254.169.254', enabled: true }, '<ENVELOPE/>')
      ).rejects.toThrow(BadRequestException);
    });
  });
});
