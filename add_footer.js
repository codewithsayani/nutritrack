const fs = require('fs');
const path = require('path');

const footerHtml = `
      <div class="sidebar-footer" id="sidebar-footer">
        <span class="footer-text">Built by <a href="https://github.com/codewithsayani" target="_blank" rel="noopener">Sayani Das</a></span>
      </div>
    </aside>`;

const cssToAdd = `
/* Sidebar Footer */
.sidebar-footer {
  padding: 1rem;
  text-align: center;
  font-size: var(--fs-xs);
  color: var(--text-muted);
  border-top: 1px solid var(--border-color);
  opacity: 0.8;
  transition: opacity 0.3s ease, width 0.3s ease, padding 0.3s ease;
  white-space: nowrap;
  overflow: hidden;
}
.sidebar-footer a {
  color: var(--primary);
  text-decoration: none;
  font-weight: 500;
}
.sidebar-footer a:hover {
  text-decoration: underline;
}
.sidebar.collapsed .sidebar-footer {
  opacity: 0;
  width: 0;
  padding: 0;
}
`;

const dir = 'd:\\\\Download\\\\Calories Tracker';

// Update all HTML files
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'login.html' && f !== 'signup.html' && f !== 'index.html');

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('sidebar-footer')) {
    content = content.replace('    </aside>', footerHtml);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated HTML:', file);
  }
}

// Update dashboard.css
const cssPath = path.join(dir, 'css', 'dashboard.css');
let cssContent = fs.readFileSync(cssPath, 'utf8');
if (!cssContent.includes('.sidebar-footer')) {
  cssContent += cssToAdd;
  fs.writeFileSync(cssPath, cssContent, 'utf8');
  console.log('Updated CSS');
}
