const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Define version type (major, minor, patch)
const versionType = process.argv[2] || 'patch';

// Read current version from package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
let [major, minor, patch] = packageJson.version.split('.').map(Number);

// Update version based on type
switch (versionType) {
  case 'major':
    major++;
    minor = 0;
    patch = 0;
    break;
  case 'minor':
    minor++;
    patch = 0;
    break;
  case 'patch':
  default:
    patch++;
    break;
}

const newVersion = `${major}.${minor}.${patch}`;
console.log(`Updating version from ${packageJson.version} to ${newVersion}`);

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

// Create a git commit and tag
try {
  execSync('git add package.json');
  execSync(`git commit -m "chore: bump version to ${newVersion}"`);
  execSync(`git tag -a v${newVersion} -m "Release version ${newVersion}"`);
  console.log(`Created git tag v${newVersion}`);

  const shouldPush = process.argv.includes('--push');
  if (shouldPush) {
    // Fetch existing tags from remote to avoid conflicts
    try {
      console.log('Fetching existing tags from remote...');
      execSync('git fetch --tags');
    } catch (fetchError) {
      console.warn('Warning: Failed to fetch tags:', fetchError.message);
    }
    
    // Push changes to remote
    execSync('git push');
    
    // Push only the new tag instead of all tags
    execSync(`git push origin v${newVersion}`);
    console.log(`Pushed changes and tag v${newVersion} to remote`);
  } else {
    console.log(`To push changes: git push && git push origin v${newVersion}`);
  }

  // Optional: Update docker-compose version
  try {
    const dockerComposePath = path.join(process.cwd(), 'docker-compose.yaml');
    if (fs.existsSync(dockerComposePath)) {
      console.log('Updating version in docker-compose.yaml...');
      let dockerComposeContent = fs.readFileSync(dockerComposePath, 'utf8');

      // Update image version tags
      dockerComposeContent = dockerComposeContent.replace(
        /:[0-9.]{5,}/g,
        `:${newVersion}`
      );

      fs.writeFileSync(dockerComposePath, dockerComposeContent);
      execSync('git add docker-compose.yaml');
      execSync(`git commit --amend --no-edit`);
      execSync(
        `git tag -f -a v${newVersion} -m "Release version ${newVersion}"`
      );
      console.log('Updated docker-compose.yaml with new version');

      if (shouldPush) {
        execSync('git push -f');
        execSync(`git push origin v${newVersion} -f`);
      }
    }
  } catch (dockerError) {
    console.warn(
      'Warning: Could not update docker-compose.yaml',
      dockerError.message
    );
  }
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
