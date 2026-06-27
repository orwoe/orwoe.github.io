(function() {
    const SERVER_HOST = "orwoe.cn";
    const API_URL = `https://api.mcsrvstat.us/2/${SERVER_HOST}`;
    const statusContent = document.getElementById('statusContent');
    const lastUpdateSpan = document.getElementById('lastUpdateTime');
    const manualBtn = document.getElementById('manualRefreshBtn');
    const refreshIcon = document.getElementById('refreshIcon');
    let refreshTimer = null;
    let isFetching = false;
    function formatTime(date) {
        return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}:${String(date.getSeconds()).padStart(2,'0')}`;
    }
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
    function renderStatus(data, pingMs = null) {
        if (!statusContent) return;
        const online = data && data.online === true;
        if (online) {
            const players = data.players || { online: 0, max: 0 };
            const onlineCount = players.online ?? 0;
            const maxPlayers = players.max ?? 0;
            const version = data.version || "未知版本";
            let motdText = "无描述";
            if (data.motd && data.motd.clean) {
                if (Array.isArray(data.motd.clean)) {
                    motdText = data.motd.clean.join(' · ');
                } else {
                    motdText = data.motd.clean;
                }
            } else if (data.motd && typeof data.motd === 'string') {
                motdText = data.motd;
            }
            let playersListHtml = '';
            if (players.list && Array.isArray(players.list) && players.list.length > 0) {
                const showPlayers = players.list.slice(0, 6);
                const playerNames = showPlayers.map(p => p).join('、');
                const moreHint = players.list.length > 6 ? ` 等${players.list.length}人` : '';
                playersListHtml = `<div class="mt-3 pt-3 border-t border-gray-300">
                            <span class="text-xs text-gray-600"><i class="fas fa-user-friends"></i> 在线玩家：</span>
                            <span class="text-sm text-gray-800 font-medium">${escapeHtml(playerNames)}${moreHint}</span>
                        </div>`;
            } else if (onlineCount > 0) {
                playersListHtml = `<div class="mt-3 pt-3 border-t border-gray-300">
                            <span class="text-xs text-gray-600"><i class="fas fa-user-friends"></i> 当前有 ${onlineCount} 位冒险家在线，但未获取到具体名单。</span>
                        </div>`;
            } else {
                playersListHtml = `<div class="mt-3 pt-3 border-t border-gray-300">
                            <span class="text-xs text-gray-500"><i class="fas fa-bed"></i> 暂时没有玩家在线，快成为第一个上线的人吧~</span>
                        </div>`;
            }
            const pingDisplay = pingMs !== null ? `${pingMs} ms` : '未知';
            const html = `
                        <div class="space-y-4">
                            <div class="flex items-center justify-between flex-wrap gap-3">
                                <div class="flex items-center gap-2">
                                    <span class="relative flex h-4 w-4">
                                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span class="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
                                    </span>
                                    <span class="font-bold text-green-700 text-lg">● 服务器在线</span>
                                </div>
                                <div class="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">延迟 ${pingDisplay}</div>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div class="bg-white rounded-xl p-3 shadow-sm border border-gray-200">
                                    <div class="text-xs text-gray-600 mb-1"><i class="fas fa-users"></i> 当前在线</div>
                                    <div class="text-3xl font-bold text-blue-600">${onlineCount}<span class="text-base text-gray-500">/${maxPlayers}</span></div>
                                </div>
                                <div class="bg-white rounded-xl p-3 shadow-sm border border-gray-200">
                                    <div class="text-xs text-gray-600 mb-1"><i class="fab fa-java"></i> 游戏版本</div>
                                    <div class="font-mono text-sm font-semibold text-gray-800 break-words">${escapeHtml(version)}</div>
                                </div>
                                <div class="bg-white rounded-xl p-3 shadow-sm border border-gray-200">
                                    <div class="text-xs text-gray-600 mb-1"><i class="fas fa-tachometer-alt"></i> 状态检测</div>
                                    <div class="text-sm text-green-700 font-medium"><i class="fas fa-check-circle"></i> 可正常连接</div>
                                </div>
                            </div>
                            <div class="bg-white rounded-lg p-3 border border-gray-200">
                                <div class="text-xs text-gray-600 mb-1"><i class="fas fa-scroll"></i> 服务器描述 (MOTD)</div>
                                <div class="text-gray-800 font-medium">${escapeHtml(motdText)}</div>
                            </div>
                            ${playersListHtml}
                        </div>
                    `;
            statusContent.innerHTML = html;
        } else {
            const offlineMsg = data && data.error ? data.error : "服务器可能关闭或网络波动";
            const html = `
                        <div class="flex flex-col items-center justify-center py-6 space-y-3">
                            <div class="relative">
                                <span class="flex h-6 w-6">
                                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span class="relative inline-flex rounded-full h-6 w-6 bg-red-500"></span>
                                </span>
                            </div>
                            <div class="text-center">
                                <div class="text-2xl font-bold text-red-600 mb-1">服务器离线</div>
                                <div class="text-gray-700 text-sm">当前无法连接到服务器 ${SERVER_HOST}</div>
                                <div class="text-gray-500 text-xs mt-2">可能原因: 服务器维护中 / 网络波动 / 启动中</div>
                                <div class="mt-3 p-2 bg-red-100 rounded text-red-700 text-xs font-medium">${escapeHtml(offlineMsg)}</div>
                                <div class="mt-4 text-sm text-gray-600">💡 请稍后刷新试试，或加入QQ群询问管理员</div>
                            </div>
                        </div>
                    `;
            statusContent.innerHTML = html;
        }
        if (lastUpdateSpan) {
            const now = new Date();
            lastUpdateSpan.innerHTML = `<i class="far fa-clock"></i> 最近更新: ${formatTime(now)}`;
        }
    }
    function showError(message) {
        if (!statusContent) return;
        const html = `
                    <div class="flex flex-col items-center justify-center py-8 space-y-3">
                        <i class="fas fa-exclamation-triangle text-4xl text-amber-600"></i>
                        <div class="text-center">
                            <div class="text-lg font-semibold text-gray-800">状态获取失败</div>
                            <div class="text-gray-700 text-sm mt-1">${escapeHtml(message)}</div>
                            <button id="retryFromErrorBtn" class="mt-4 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm hover:bg-blue-200 transition font-medium shadow">
                                <i class="fas fa-redo-alt"></i> 点击重试
                            </button>
                        </div>
                    </div>
                `;
        statusContent.innerHTML = html;
        const retryBtn = document.getElementById('retryFromErrorBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => fetchServerStatus(true));
        }
        if (lastUpdateSpan) lastUpdateSpan.innerHTML = `<i class="far fa-clock"></i> 获取失败，待重试`;
    }
    function showSkeleton() {
        if (!statusContent) return;
        statusContent.innerHTML = `
                    <div class="animate-pulse space-y-4">
                        <div class="flex items-center justify-between">
                            <div class="skeleton-pulse h-6 w-24 rounded"></div>
                            <div class="skeleton-pulse h-8 w-20 rounded-full"></div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div><div class="skeleton-pulse h-4 w-full rounded mb-2"></div><div class="skeleton-pulse h-6 w-20 rounded"></div></div>
                            <div><div class="skeleton-pulse h-4 w-full rounded mb-2"></div><div class="skeleton-pulse h-6 w-20 rounded"></div></div>
                            <div><div class="skeleton-pulse h-4 w-full rounded mb-2"></div><div class="skeleton-pulse h-6 w-32 rounded"></div></div>
                        </div>
                        <div class="skeleton-pulse h-16 w-full rounded"></div>
                    </div>
                `;
    }
    async function fetchServerStatus(isManual = false) {
        if (isFetching) return;
        isFetching = true;
        if (isManual) {
            showSkeleton();
            if (refreshIcon) refreshIcon.classList.add('fa-spin');
        } else {
            const isEmpty = !statusContent.innerText.trim() || statusContent.innerText.includes('状态获取失败');
            if (isEmpty) showSkeleton();
        }
        const startTime = performance.now();
        let pingTime = null;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            const response = await fetch(API_URL, { signal: controller.signal });
            clearTimeout(timeoutId);
            const endTime = performance.now();
            pingTime = Math.round(endTime - startTime);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            renderStatus(data, pingTime);
        } catch (error) {
            console.warn("服务器状态获取失败:", error);
            let errorMsg = "无法连接到状态监测服务，请检查网络后点击刷新";
            if (error.name === 'AbortError') errorMsg = "请求超时，服务器状态API响应较慢";
            showError(errorMsg);
            if (lastUpdateSpan) lastUpdateSpan.innerHTML = `<i class="far fa-clock"></i> 请求失败，稍后自动重试`;
        } finally {
            isFetching = false;
            if (refreshIcon) refreshIcon.classList.remove('fa-spin');
        }
    }
    function manualRefresh() {
        fetchServerStatus(true);
        resetAutoRefresh();
    }
    function resetAutoRefresh() {
        if (refreshTimer) clearInterval(refreshTimer);
        refreshTimer = setInterval(() => fetchServerStatus(false), 30000);
    }
    window.addEventListener('beforeunload', () => {
        if (refreshTimer) clearInterval(refreshTimer);
    });
    function handleVisibilityChange() {
        if (document.hidden) {
            if (refreshTimer) {
                clearInterval(refreshTimer);
                refreshTimer = null;
            }
        } else {
            if (!refreshTimer) {
                resetAutoRefresh();
                fetchServerStatus(false);
            }
        }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    if (manualBtn) manualBtn.addEventListener('click', manualRefresh);
    fetchServerStatus(false);
    resetAutoRefresh();
})();