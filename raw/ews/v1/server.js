window.EWSEngine = {
    getHelpers: function(thisExecutionId) {
        return `
            const __execId = ${thisExecutionId};
            const rng = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
            const sleep = ms => new Promise(r => setTimeout(r, ms));
            const range = (start, end) => Array.from({length: end - start + 1}, (_, i) => start + i);
            const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
            const pick = arr => arr[Math.floor(Math.random() * arr.length)];
            
            const print = msg => console.log("%c[EWS INFO]: %c" + msg, "color: #00bcd4; font-weight: bold;", "color: inherit;");
            const success = msg => console.log("%c[EWS OK]: %c" + msg, "color: #4caf50; font-weight: bold;", "color: inherit;");
            const notify = msg => console.warn("[EWS AVISO]: " + msg);
            const fail = msg => console.error("[EWS ERRO]: " + msg);
            const showTable = data => console.table(data);
            
            const getElement = id => document.getElementById(id);
            const getElements = sel => document.querySelectorAll(sel);
            const createElement = tag => document.createElement(tag);
            const addClass = (el, cls) => el.classList.add(cls);
            const removeClass = (el, cls) => el.classList.remove(cls);
            const toggleClass = (el, cls) => el.classList.toggle(cls);
            const setStyle = (el, prop, val) => el.style[prop] = val;
            const getAttribute = (el, attr) => el.getAttribute(attr);
            const setAttribute = (el, attr, val) => el.setAttribute(attr, val);
            const removeElement = el => el.remove();
            const hideElement = el => el.style.display = 'none';
            const showElement = el => el.style.display = 'block';
            
            const fetchData = async url => {
                const res = await fetch(url);
                return await res.json();
            };
            const fetchText = async url => {
                const res = await fetch(url);
                return await res.text();
            };
            const postData = async (url, data) => {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(data)
                });
                return await res.json();
            };
            
            const saveToStorage = (key, val) => localStorage.setItem(key, JSON.stringify(val));
            const loadFromStorage = key => {
                const val = localStorage.getItem(key);
                return val ? JSON.parse(val) : null;
            };
            const deleteFromStorage = key => localStorage.removeItem(key);
            const clearStorage = () => localStorage.clear();
            
            const copyToClipboard = async text => await navigator.clipboard.writeText(text);
            const readFromClipboard = async () => await navigator.clipboard.readText();
            
            const playSound = url => new Audio(url).play();
            const vibrate = ms => navigator.vibrate ? navigator.vibrate(ms) : null;
            
            const scrollTo = y => window.scrollTo({top: y, behavior: 'smooth'});
            const scrollToElement = el => el.scrollIntoView({behavior: 'smooth'});
            
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const isOnline = navigator.onLine;
            const getLanguage = navigator.language;
            const getUserAgent = navigator.userAgent;
        `;
    },

    transpile: function(code, thisExecutionId) {
        
        code = code.replace(/--.*$/gm, "");
        code = code.replace(/\/\/.*$/gm, "");
        code = code.replace(/\/\*[\s\S]*?\*\//g, "");

        code = code.replace(/^\s*clear\s*$/gim, "console.clear();");

        code = code.replace(/math\((.*?)\)/ig, (_, content) => {
            let t = content.replace(/\[(.*?)\]/g, "$1").replace(/÷/g, "/").replace(/×/g, "*");
            return `eval(\`${t}\`)`;
        });

        code = code.replace(/\bhour\b/ig, "(new Date().getHours())");
        code = code.replace(/\bminutes\b/ig, "(new Date().getMinutes())");
        code = code.replace(/\bseconds\b/ig, "(new Date().getSeconds())");
        code = code.replace(/\bday\b/ig, "(new Date().getDate())");
        code = code.replace(/\bmonth\b/ig, "(new Date().getMonth() + 1)");
        code = code.replace(/\byear\b/ig, "(new Date().getFullYear())");
        code = code.replace(/\btimestamp\b/ig, "(Date.now())");

        code = code.replace(/\bcreate\s+function\s+(\w+)\s*\(\s*(.*?)\s*\)/ig, "var $1 = async function($2) {");
        code = code.replace(/\bcreate\s+function\s+(\w+)/ig, "var $1 = async function() {");
        code = code.replace(/\bset\s+function\s+(\w+)\s*\(\s*(.*?)\s*\)/ig, "$1 = async function($2) {");
        code = code.replace(/\bset\s+function\s+(\w+)/ig, "$1 = async function() {");

        code = code.replace(/\bcreate\s+(\w+)\s*=\s*/ig, "var $1 = ");
        code = code.replace(/\bcreate\s+(\w+)\s*$/img, "var $1");
        code = code.replace(/\bset\s+(\w+)\s*=\s*/ig, "$1 = ");
        code = code.replace(/\bdelete\s+(\w+)/ig, "$1 = undefined");

        function mapOp(op) {
            if (op.trim() === "=") return "===";
            if (op.trim() === "!=") return "!==";
            return op.trim();
        }
        function stripOuterParens(s) {
            s = s.trim();
            if (s.startsWith("(") && s.endsWith(")")) return s.slice(1, -1).trim();
            return s;
        }
        code = code.replace(/\bif\s+not\s+(.+?)\s+then\b/ig, (_, raw) => {
            const inner = stripOuterParens(raw);
            const m = inner.match(/^(\w+)\s*(===|!==|>=|<=|>|<|!=|=)\s*(.+)$/i);
            if (m) {
                if (m[2].trim() === "=" || m[2].trim() === "!=") return `if (${m[1]} ${mapOp(m[2]) === "===" ? "!==" : "==="} ${m[3].trim()}) {`;
                return `if (!(${m[1]} ${mapOp(m[2])} ${m[3].trim()})) {`;
            }
            return `if (!(${inner})) {`;
        });
        code = code.replace(/\bif\s+(.+?)\s+then\b/ig, (_, raw) => {
            const inner = stripOuterParens(raw);
            const m = inner.match(/^(\w+)\s*(===|!==|>=|<=|>|<|!=|=)\s*(.+)$/i);
            if (m) return `if (${m[1]} ${mapOp(m[2])} ${m[3].trim()}) {`;
            return `if (${inner}) {`;
        });
        code = code.replace(/\belse\b/ig, "} else {");

        const executionCheck = `if(__execId !== ${thisExecutionId}) break;`;
        code = code.replace(/\bloop\s*\(?\s*\)?\s*(?=\s|$)/ig, `while(true) { ${executionCheck}`);
        code = code.replace(/\brepeat\s+(\d+)\s+times\b/ig, `for(let __i=0; __i<$1; __i++) { ${executionCheck}`);
        code = code.replace(/\bforeach\s+(\w+)\s+in\s+(\w+)\b/ig, `for(let $1 of $2) { ${executionCheck}`);
        code = code.replace(/\bstoploop\b/ig, "__STOPLOOP__");
        code = code.replace(/\bnextloop\b/ig, "__NEXTLOOP__");

        code = code.replace(/\bexecute\s*\(\s*(\w+\s*\(.*?\))\s*\)/ig, "await $1");
        code = code.replace(/\bexecute\s*\(\s*(\w+)\s*\)/ig, "await $1()");
        code = code.replace(/(?<!await )\bwait\s*\(/g, "await sleep(");

        code = code.replace(/\barray\s*\[(.*?)\]/ig, "[$1]");
        code = code.replace(/\bobject\s*\{(.*?)\}/ig, "{$1}");
        code = code.replace(/\blength\s+of\s+(\w+)/ig, "$1.length");
        code = code.replace(/\bpush\s+(\w+)\s+to\s+(\w+)/ig, "$2.push($1)");

        code = code.replace(/\brandom\s+(\d+)\s+to\s+(\d+)/ig, "rng($1, $2)");
        code = code.replace(/\brandom\b/ig, "Math.random()");

        code = code.replace(/\bevent\s+#(\w+)\s+on\s*\(\s*click\s*\)\s*\{/ig, "getElement('$1').addEventListener('click', async () => {");
        code = code.replace(/\bevent\s+#(\w+)\s+on\s*\(\s*(\w+)\s*\)\s*\{/ig, "getElement('$1').addEventListener('$2', async (e) => {");
        code = code.replace(/\bnavigate\s+to\s+["'](.*?)["']/ig, "window.location.href = '$1'");
        code = code.replace(/\bopen\s+tab\s+["'](.*?)["']/ig, "window.open('$1', '_blank')");
        code = code.replace(/\bask\s+["'](.*?)["']/ig, "prompt('$1')");
        code = code.replace(/\bconfirm\s+["'](.*?)["']/ig, "confirm('$1')");
        code = code.replace(/\balert\s+(.+)$/gim, "alert($1);");
        code = code.replace(/\bsend\s+(.+)\s+to\s+#(\w+)/ig, "getElement('$2').innerText = $1");
        code = code.replace(/\bget\s+value\s+from\s+#(\w+)/ig, "getElement('$1').value");
        code = code.replace(/\bset\s+value\s+of\s+#(\w+)\s+to\s+(.+)/ig, "getElement('$1').value = $2");
        code = code.replace(/\bhide\s+#(\w+)/ig, "hideElement(getElement('$1'))");
        code = code.replace(/\bshow\s+#(\w+)/ig, "showElement(getElement('$1'))");
        code = code.replace(/\bremove\s+#(\w+)/ig, "removeElement(getElement('$1'))");
        code = code.replace(/\badd\s+class\s+["'](.+?)["']\s+to\s+#(\w+)/ig, "addClass(getElement('$2'), '$1')");
        code = code.replace(/\bremove\s+class\s+["'](.+?)["']\s+from\s+#(\w+)/ig, "removeClass(getElement('$2'), '$1')");
        code = code.replace(/\btoggle\s+class\s+["'](.+?)["']\s+on\s+#(\w+)/ig, "toggleClass(getElement('$2'), '$1')");

        code = code.replace(/\bfetch\s+["'](.*?)["']/ig, "await fetchData('$1')");
        code = code.replace(/\bfetch\s+text\s+from\s+["'](.*?)["']/ig, "await fetchText('$1')");
        code = code.replace(/\bpost\s+(.+)\s+to\s+["'](.*?)["']/ig, "await postData('$2', $1)");

        code = code.replace(/\bsave\s+(.+)\s+as\s+["'](.+?)["']/ig, "saveToStorage('$2', $1)");
        code = code.replace(/\bload\s+["'](.+?)["']/ig, "loadFromStorage('$1')");
        code = code.replace(/\bdelete\s+storage\s+["'](.+?)["']/ig, "deleteFromStorage('$1')");
        code = code.replace(/\bclear\s+storage/ig, "clearStorage()");

        code = code.replace(/\bcopy\s+(.+)\s+to\s+clipboard/ig, "await copyToClipboard($1)");
        code = code.replace(/\bread\s+clipboard/ig, "await readFromClipboard()");

        code = code.replace(/\bplay\s+sound\s+["'](.*?)["']/ig, "playSound('$1')");
        code = code.replace(/\bvibrate\s+(\d+)/ig, "vibrate($1)");

        code = code.replace(/\bscroll\s+to\s+(\d+)/ig, "scrollTo($1)");
        code = code.replace(/\bscroll\s+to\s+#(\w+)/ig, "scrollToElement(getElement('$1'))");

        code = code.replace(/\bprint\s+(.+)$/gim, "print($1);");
        code = code.replace(/\bnotify\s+(.+)$/gim, "notify($1);");
        code = code.replace(/\bfail\s+(.+)$/gim, "fail($1);");
        code = code.replace(/\bdone\s+(.+)$/gim, "success($1);");
        code = code.replace(/\bshow\s+table\s+of\s+(\w+)/ig, "showTable($1);");

        code = code.replace(/\bget\s+url\s+of\s+current\s+tab/ig, "window.location.href");
        code = code.replace(/\bget\s+title\s+of\s+current\s+tab/ig, "document.title");
        code = code.replace(/\bget\s+width\s+of\s+window/ig, "window.innerWidth");
        code = code.replace(/\bget\s+height\s+of\s+window/ig, "window.innerHeight");
        code = code.replace(/\bis\s+mobile/ig, "isMobile");
        code = code.replace(/\bis\s+online/ig, "isOnline");

        code = code.replace(/^\s*\bbreak\b\s*$/img, "}");
        code = code.replace(/__STOPLOOP__/g, "break;");
        code = code.replace(/__NEXTLOOP__/g, "continue;");

        return code;
    }
}
