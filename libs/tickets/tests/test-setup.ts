// jest.setup.js
// jest.setup.ts
import './next-auth.d.ts'; // Ensure Jest knows about your custom NextAuth types

import { TextEncoder, TextDecoder } from 'util';

//@ts-ignore
global.TextEncoder = TextEncoder;
//@ts-ignore
global.TextDecoder = TextDecoder;
