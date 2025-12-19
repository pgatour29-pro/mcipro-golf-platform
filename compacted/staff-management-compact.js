        // Build Golf Course Code Management UI - COMPACT VERSION
        let codeManagementHTML = `
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                <div class="flex items-center justify-between gap-4">
                    <div class="flex items-center gap-4">
                        <div class="bg-white rounded-lg p-3 border-2 border-blue-300">
                            <div class="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Current Code</div>
                            <div class="text-2xl font-bold text-blue-600 font-mono tracking-wider">${staffCode}</div>
                        </div>
                        <div>
                            <h3 class="font-semibold text-gray-900 flex items-center gap-2">
                                <span class="material-symbols-outlined text-blue-600 text-lg">vpn_key</span>
                                Staff Registration Code
                            </h3>
                            <p class="text-xs text-gray-600">Share with new staff to register via LINE</p>
                        </div>
                    </div>
                    <button onclick="StaffManagement.showChangeCodeModal()"
                            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap">
                        <span class="material-symbols-outlined text-sm">edit</span>
                        Change Code
                    </button>
                </div>
            </div>
            ${this.renderPendingApprovals()}
        `;
