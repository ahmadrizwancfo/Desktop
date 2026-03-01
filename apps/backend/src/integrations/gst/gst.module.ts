import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GstService } from './gst.service';
import { SandboxGSTProvider } from './providers/sandbox.provider';
import { GstController } from './gst.controller';

@Module({
    imports: [ConfigModule],
    controllers: [GstController],
    providers: [GstService, SandboxGSTProvider],
    exports: [GstService]
})
export class GstModule { }
