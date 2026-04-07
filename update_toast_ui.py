import os, re

files = [
    r'c:\Users\ADMN\Downloads\vamsiprodupscappfinal-main\PrepAssistV2\prepassist-web-v2\src\app\evaluate\page.tsx',
    r'c:\Users\ADMN\Downloads\vamsiprodupscappfinal-main\PrepAssistV2\prepassist-web-v2\src\app\mindmaps\page.tsx',
    r'c:\Users\ADMN\Downloads\vamsiprodupscappfinal-main\PrepAssistV2\prepassist-web-v2\src\app\notes-tracker\page.tsx',
    r'c:\Users\ADMN\Downloads\vamsiprodupscappfinal-main\PrepAssistV2\prepassist-web-v2\src\app\quiz\page.tsx',
    r'c:\Users\ADMN\Downloads\vamsiprodupscappfinal-main\PrepAssistV2\prepassist-web-v2\src\app\rag-notes\page.tsx'
]

new_ui_block = '''{/* Insufficient Credits Banner */}
      <AnimatePresence>
        {insufficientCredits && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: "-50%" }} 
            animate={{ opacity: 1, y: 0, x: "-50%" }} 
            exit={{ opacity: 0, y: -20, x: "-50%" }} 
            className="fixed top-24 left-1/2 z-[100] w-[90%] max-w-[420px] bg-[#212121] text-white p-5 rounded-2xl shadow-2xl border border-white/5 font-sans"
          >
             <div className="flex items-center gap-2 mb-1.5">
                <XCircle className="w-5 h-5 text-white/50" />
                <h3 className="text-[17px] font-bold text-white/90">Insufficient AI Credits</h3>
             </div>
             <p className="text-[14px] text-white/50 mb-6 pl-7 font-medium">
                Your AI credits balance is too low to continue.
             </p>
             <div className="flex items-center gap-3 pl-7 flex-wrap">
                <button onClick={() => setInsufficientCredits(false)} className="px-5 py-2 bg-[#323232] hover:bg-[#3d3d3d] text-white/80 text-sm font-semibold rounded-xl transition-colors shadow-sm">
                   Dismiss
                </button>
                <Link href="/pricing" className="px-5 py-2 bg-[#323232] hover:bg-[#3d3d3d] text-white/80 text-sm font-semibold rounded-xl transition-colors shadow-sm">
                   See Plans
                </Link>
                <Link href="/pricing" className="px-5 py-2 bg-[#0078D4] hover:bg-[#0078D4]/90 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm tracking-wide">
                   Purchase Credits
                </Link>
             </div>
          </motion.div>
        )}
      </AnimatePresence>'''

import sys

for file_path in files:
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # We will dynamically replace the existing AnimatePresence block that checks insufficientCredits
        # Regular expression to match the entire banner block
        pattern = re.compile(r'\{\/\*\s*Insufficient Credits Banner\s*\*\/\}.*?<\/AnimatePresence>', re.DOTALL)
        
        new_content, num_subs = pattern.subn(new_ui_block, content)
        
        if num_subs > 0:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated: {os.path.basename(file_path)}")
        else:
            print(f"No match found for: {os.path.basename(file_path)}")
            
    except Exception as e:
        print(f"Error processing {os.path.basename(file_path)}: {e}")

print("Update complete.")
