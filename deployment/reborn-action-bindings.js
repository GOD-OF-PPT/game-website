(() => {
  const actions = new Set([
    'actFireStaff', 'actFirstOrder', 'actHireStaff', 'actRestFlow', 'actToggleJob', 'actUpgradeRoom',
    'auditionSfx', 'autoSolveMemoryGrid', 'castCompanionSkill', 'claimRelicAndAdvance', 'closeModal',
    'confirmReturnTitle', 'copyEndingReport', 'cycleAudioMode', 'executeQuarterSettlement', 'exitToClassicLedger',
    'exportSaveString', 'handleAdvanceQuarter', 'handleQuickFriendClick', 'hangoutCompanion', 'importSaveString',
    'launchNewCampaign', 'opBuyEquity', 'opDeliverDs', 'openActPreviewModal', 'openAudioMixerModal',
    'openCodexModal', 'openCompanionStory', 'openMemoryGridModal', 'openSaveModal', 'opExpandRelay',
    'opFindDsLeads', 'opRefreshCourse', 'opRunCohort', 'opUnlockCourse', 'opUnlockDeepseek', 'opUnlockRelay',
    'opUpgradeRelay', 'opUpgradeVideo', 'opVideoSponsor', 'opVideoViral', 'pickEraDilemma', 'pickMemoryCell',
    'pickSetup', 'playHandCard', 'playShowdownMove', 'promptReturnTitle', 'quickLaunchFromPrologue',
    'renderAll', 'replayPrologue', 'rerollHand', 'resolveCompanionStory', 'resumeSavedRun', 'selectBgmTheme',
    'selectMarketStock', 'setBgmVolume', 'setGrowthSub', 'setSfxVolume', 'skipPrologueToSetup',
    'startNewGamePlusRun', 'stepPrologue', 'switchStageTab', 'toggleAutoMaintain', 'toggleBgmSwitch',
    'toggleLedgerDrawer', 'toggleOverclock', 'toggleSfxSwitch', 'tradeStock', 'triggerSpotlightAction',
    'unlockMarketIntel', 'unlockTechNode',
  ]);
  const eventTypes = { onclick: 'click', oninput: 'input', onchange: 'change' };

  function readArgument(node) {
    if (node.type === 'Literal' && (node.value === null || ['string', 'number', 'boolean'].includes(typeof node.value))) {
      return () => node.value;
    }
    if (node.type === 'Identifier' && node.name === 'event') return event => event;
    if (node.type === 'UnaryExpression' && node.operator === '-' && typeof node.argument.value === 'number') {
      return () => -node.argument.value;
    }
    if (node.type === 'MemberExpression' && !node.computed && node.object.type === 'ThisExpression' && ['value', 'checked'].includes(node.property.name)) {
      return event => event.currentTarget[node.property.name];
    }
    throw new Error('Unsupported game action argument');
  }

  DOMPurify.addHook('uponSanitizeAttribute', (element, attribute) => {
    if (!Object.hasOwn(eventTypes, attribute.attrName)) return;
    let calls;
    try {
      calls = acorn.parse(attribute.attrValue, { ecmaVersion: 2024 }).body.map(statement => {
        const call = statement.expression;
        if (statement.type !== 'ExpressionStatement' || call?.type !== 'CallExpression' ||
            call.callee.type !== 'Identifier' || !actions.has(call.callee.name)) {
          throw new Error('Unsupported game action');
        }
        return { name: call.callee.name, args: call.arguments.map(readArgument) };
      });
    } catch {
      return;
    }
    element.addEventListener(eventTypes[attribute.attrName], event => {
      for (const { name, args } of calls) {
        if (typeof window[name] === 'function') window[name](...args.map(read => read(event)));
      }
    });
  });
})();
