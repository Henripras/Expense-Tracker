import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// Default paths for local Android development environment
const jdkPath = 'C:\\Program Files\\Android\\Android Studio\\jbr';
const sdkPath = path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk');

process.env.JAVA_HOME = jdkPath;
process.env.ANDROID_HOME = sdkPath;

console.log('=========================================');
console.log('Building Android APK (Finansiku)...');
console.log('JAVA_HOME:', process.env.JAVA_HOME);
console.log('ANDROID_HOME:', process.env.ANDROID_HOME);
console.log('=========================================');

const isWindows = process.platform === 'win32';
const gradlewCmd = isWindows ? 'gradlew.bat' : './gradlew';

const gradle = spawn(gradlewCmd, ['assembleDebug'], {
  cwd: path.resolve('android'),
  stdio: 'inherit',
  shell: true
});

gradle.on('close', (code) => {
  if (code === 0) {
    console.log('=========================================');
    console.log('APK build successful!');
    
    // Copy the APK to the root of the project
    const sourceApk = path.resolve('android/app/build/outputs/apk/debug/app-debug.apk');
    const destApk = path.resolve('Finansiku-debug.apk');
    
    if (fs.existsSync(sourceApk)) {
      try {
        fs.copyFileSync(sourceApk, destApk);
        console.log(`APK successfully copied to: ${destApk}`);
      } catch (err) {
        console.error('Failed to copy APK to root:', err.message);
      }
    } else {
      console.error('Could not find compiled APK at:', sourceApk);
    }
    console.log('=========================================');
  } else {
    console.error(`Gradle process exited with code ${code}`);
    process.exit(code);
  }
});
