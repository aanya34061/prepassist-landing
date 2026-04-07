import os, re

files = [
    r'c:\Users\ADMN\Downloads\vamsiprodupscappfinal-main\PrepAssistV2\prepassist-web-v2\src\app\evaluate\page.tsx',
    r'c:\Users\ADMN\Downloads\vamsiprodupscappfinal-main\PrepAssistV2\prepassist-web-v2\src\app\mindmaps\page.tsx',
    r'c:\Users\ADMN\Downloads\vamsiprodupscappfinal-main\PrepAssistV2\prepassist-web-v2\src\app\notes-tracker\page.tsx',
    r'c:\Users\ADMN\Downloads\vamsiprodupscappfinal-main\PrepAssistV2\prepassist-web-v2\src\app\rag-notes\page.tsx'
]

ui_block = '''
      {/* Insufficient Credits Banner */}
      <AnimatePresence>
        {insufficientCredits && (
          <motion.div initial={{opacity:0, y:-20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-white border border-rose-200 text-slate-800 px-6 py-5 rounded-[2rem] shadow-2xl flex flex-col items-center gap-3 w-[90%] max-w-sm">
             <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mb-1 text-rose-500">
                <XCircle className="w-6 h-6" />
             </div>
             <div className="font-black text-rose-500 text-lg">Insufficient credits</div>
             <p className="text-sm font-medium text-slate-500 text-center mb-2 leading-relaxed">
                You do not have enough AI Credits to perform this action. Please do a Top-Up to get more AI Credits.
             </p>
             <div className="flex w-full gap-3 mt-2">
                <button onClick={() => setInsufficientCredits(false)} className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-xl transition-colors text-sm">Dismiss</button>
                <Link href="/pricing" className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl transition-colors text-sm text-center flex items-center justify-center">Top-Up Now</Link>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
'''

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add Link
    if 'import Link from "next/link";' not in content:
        content = content.replace('import { useState', 'import Link from "next/link";\nimport { useState')
    
    # 2. Ensure XCircle is imported
    if 'XCircle' not in content:
        content = re.sub(r'import \{ ([^\}]+) \} from "lucide-react";', r'import { \1, XCircle } from "lucide-react";', content)

    # 3. Ensure motion, AnimatePresence is imported
    if 'AnimatePresence' not in content:
       content = content.replace('import { useState', 'import { motion, AnimatePresence } from "framer-motion";\nimport { useState')

    # 4. Add State
    if 'insufficientCredits' not in content:
        content = re.sub(r'(export default function [a-zA-Z]+\(\) \{)', r'\1\n  const [insufficientCredits, setInsufficientCredits] = useState(false);', content)

    # 5. Fix Catch Blocks
    if 'content: "Insufficient credits"' in content:
        content = content.replace('setMessages(prev => [...prev, { role: \'assistant\', content: "Insufficient credits" }]);', 'return setInsufficientCredits(true);')

    content = content.replace('alert("Insufficient credits");', 'setInsufficientCredits(true);')
    content = content.replace('return alert("Insufficient credits");', 'return setInsufficientCredits(true);')

    # 6. Inject UI
    if 'Insufficient Credits Banner' not in content:
        content = re.sub(r'(<div className="min-h-screen[^>]*>)', r'\1\n' + ui_block, content, count=1)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Updates completed successfully.")
