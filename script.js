// 囚徒困境策略模拟器 JavaScript 逻辑

// 游戏常量
const PAYOFF_MATRIX = {
  // [A的选择][B的选择] => [A的得分, B的得分]
  cooperate: {
    cooperate: [3, 3], // 双方合作
    defect: [0, 5], // A合作，B背叛
  },
  defect: {
    cooperate: [5, 0], // A背叛，B合作
    defect: [1, 1], // 双方背叛
  },
};

// 策略函数
const strategies = {
  // 始终合作
  alwaysCooperate: (_, __) => "cooperate",

  // 始终背叛
  alwaysDefect: (_, __) => "defect",

  // 以牙还牙：首回合合作，之后模仿对方上一回合的选择
  titForTat: (history, player) => {
    if (history.length === 0) {
      return "cooperate";
    }
    const opponentIndex = player === "A" ? 1 : 0;
    const lastRound = history[history.length - 1];
    return lastRound.choices[opponentIndex];
  },

  // 记仇者：一直合作，直到对方背叛后永远背叛
  grudger: (history, player) => {
    const opponentIndex = player === "A" ? 1 : 0;
    for (const round of history) {
      if (round.choices[opponentIndex] === "defect") {
        return "defect";
      }
    }
    return "cooperate";
  },

  // 随机策略
  random: (_, __) => {
    return Math.random() < 0.5 ? "cooperate" : "defect";
  },
};

// 图表对象
let scoreChart = null;

// 添加策略名称映射
const strategyNames = {
  alwaysCooperate: "始终合作",
  alwaysDefect: "始终背叛",
  titForTat: "以牙还牙",
  grudger: "记仇者",
  random: "随机策略",
};

// 界面元素
document.addEventListener("DOMContentLoaded", () => {
  const playerAStrategySelect = document.getElementById("playerAStrategy");
  const playerBStrategySelect = document.getElementById("playerBStrategy");
  const iterationRadios = document.getElementsByName("iterationOption");
  const customIterationContainer = document.getElementById(
    "customIterationContainer"
  );
  const customIterationsInput = document.getElementById("customIterations");
  const startSimulationButton = document.getElementById("startSimulation");
  const simulationResults = document.getElementById("simulationResults");
  const toggleDetailsButton = document.getElementById("toggleDetails");
  const detailsSection = document.getElementById("detailsSection");
  const toggleIcon = document.getElementById("toggleIcon");

  // 处理回合数选项
  iterationRadios.forEach((radio) => {
    radio.addEventListener("change", function () {
      if (this.value === "custom") {
        customIterationContainer.classList.remove("hidden");
        customIterationsInput.focus();
      } else {
        customIterationContainer.classList.add("hidden");
      }
    });
  });

  // 自定义回合数输入验证
  customIterationsInput.addEventListener("input", function () {
    // 确保输入值在允许范围内
    let value = parseInt(this.value);
    if (isNaN(value)) {
      this.value = "20";
    } else if (value < 5) {
      this.value = "5";
    } else if (value > 200) {
      this.value = "200";
    }
  });

  // 开始模拟按钮点击事件
  startSimulationButton.addEventListener("click", () => {
    // 获取配置
    const playerAStrategy = playerAStrategySelect.value;
    const playerBStrategy = playerBStrategySelect.value;

    // 获取选择的回合数
    let iterations = 20; // 默认值
    for (const radio of iterationRadios) {
      if (radio.checked) {
        if (radio.value === "custom") {
          iterations = parseInt(customIterationsInput.value) || 20;
        } else {
          iterations = parseInt(radio.value);
        }
        break;
      }
    }

    // 显示策略名称
    document.getElementById("playerAStrategyDisplay").textContent =
      strategyNames[playerAStrategy];
    document.getElementById("playerBStrategyDisplay").textContent =
      strategyNames[playerBStrategy];
    document.getElementById("playerAStrategyDisplaySmall").textContent =
      strategyNames[playerAStrategy];
    document.getElementById("playerBStrategyDisplaySmall").textContent =
      strategyNames[playerBStrategy];

    // 执行模拟
    const results = runSimulation(playerAStrategy, playerBStrategy, iterations);

    // 重置显示
    resetSimulationDisplay();

    // 显示结果区域
    simulationResults.classList.remove("hidden");
    simulationResults.classList.add("fade-in");

    // 滚动到结果区域
    simulationResults.scrollIntoView({ behavior: "smooth" });

    // 初始状态下折叠详细信息
    detailsSection.classList.remove("expanded");
    toggleIcon.classList.remove("fa-chevron-up");
    toggleIcon.classList.add("fa-chevron-down");
    toggleDetailsButton.querySelector("span").textContent = "查看详细信息";

    // 动画显示每回合结果
    animateSimulation(results);

    // 生成历史表格
    generateHistoryTable(results);
  });

  // 展开/折叠详细信息
  toggleDetailsButton.addEventListener("click", () => {
    detailsSection.classList.toggle("expanded");

    // 更新按钮图标和文本
    if (detailsSection.classList.contains("expanded")) {
      toggleIcon.classList.remove("fa-chevron-down");
      toggleIcon.classList.add("fa-chevron-up");
      toggleDetailsButton.querySelector("span").textContent = "隐藏详细信息";

      // 当展开详细信息时，滚动到高亮行（如果有）
      setTimeout(() => {
        const historyTableBody = document.getElementById("historyTableBody");
        const highlightedRow = historyTableBody.querySelector(".bg-indigo-50");
        if (highlightedRow) {
          const tableContainer = document.querySelector(
            ".history-table-container"
          );
          if (tableContainer) {
            tableContainer.scrollTop = Math.max(
              0,
              highlightedRow.offsetTop - 100
            );
          }
        }
      }, 300); // 给展开动画一点时间
    } else {
      toggleIcon.classList.remove("fa-chevron-up");
      toggleIcon.classList.add("fa-chevron-down");
      toggleDetailsButton.querySelector("span").textContent = "查看详细信息";
    }
  });

  // 初始化图表
  initCharts();

  // 添加一些交互性提示
  const strategySelects = document.querySelectorAll("select");
  strategySelects.forEach((select) => {
    select.addEventListener("change", function () {
      this.classList.add("pulse");
      setTimeout(() => {
        this.classList.remove("pulse");
      }, 1000);
    });
  });

  // 跳转到当前回合按钮事件
  document
    .getElementById("scrollToCurrentRound")
    .addEventListener("click", function () {
      const currentRound = parseInt(
        document.getElementById("currentRoundNumber").textContent
      );
      if (currentRound > 0) {
        const historyTableBody = document.getElementById("historyTableBody");
        const rows = historyTableBody.querySelectorAll("tr");

        if (rows.length >= currentRound) {
          const highlightedRow = rows[currentRound - 1];
          const tableContainer = document.querySelector(
            ".history-table-container"
          );
          if (tableContainer && highlightedRow) {
            tableContainer.scrollTop = Math.max(
              0,
              highlightedRow.offsetTop - 100
            );

            // 添加一个短暂的高亮效果
            highlightedRow.classList.add("bg-indigo-200");
            setTimeout(() => {
              highlightedRow.classList.remove("bg-indigo-200");
            }, 1000);
          }
        }
      }
    });

  // 界面引导提示
  setTimeout(() => {
    const startButton = document.getElementById("startSimulation");
    startButton.classList.add("pulse");
    setTimeout(() => {
      startButton.classList.remove("pulse");
    }, 2000);
  }, 3000);
});

// 初始化图表
function initCharts() {
  // 创建得分走势图
  const scoreCtx = document.getElementById("scoreChart").getContext("2d");
  scoreChart = new Chart(scoreCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "玩家 A 得分",
          data: [],
          borderColor: "rgb(79, 70, 229)",
          backgroundColor: "rgba(79, 70, 229, 0.1)",
          tension: 0.1,
          fill: false,
        },
        {
          label: "玩家 B 得分",
          data: [],
          borderColor: "rgb(220, 38, 38)",
          backgroundColor: "rgba(220, 38, 38, 0.1)",
          tension: 0.1,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
        },
        tooltip: {
          mode: "index",
          intersect: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "累计得分",
          },
        },
        x: {
          title: {
            display: true,
            text: "回合",
          },
        },
      },
      animation: {
        duration: 500,
      },
    },
  });
}

// 运行模拟
function runSimulation(playerAStrategy, playerBStrategy, iterations) {
  const history = [];
  let playerAScore = 0;
  let playerBScore = 0;

  for (let i = 0; i < iterations; i++) {
    // 获取双方选择
    const choiceA = strategies[playerAStrategy](history, "A");
    const choiceB = strategies[playerBStrategy](history, "B");

    // 计算得分
    const [scoreA, scoreB] = PAYOFF_MATRIX[choiceA][choiceB];
    playerAScore += scoreA;
    playerBScore += scoreB;

    // 记录这一回合的结果
    history.push({
      round: i + 1,
      choices: [choiceA, choiceB],
      scores: [scoreA, scoreB],
      cumulativeScores: [playerAScore, playerBScore],
    });
  }

  // 计算选择合作和背叛的比例
  let playerACooperateCount = 0;
  let playerBCooperateCount = 0;

  for (const round of history) {
    if (round.choices[0] === "cooperate") playerACooperateCount++;
    if (round.choices[1] === "cooperate") playerBCooperateCount++;
  }

  const playerACooperatePercent = (playerACooperateCount / iterations) * 100;
  const playerADefectPercent = 100 - playerACooperatePercent;
  const playerBCooperatePercent = (playerBCooperateCount / iterations) * 100;
  const playerBDefectPercent = 100 - playerBCooperatePercent;

  return {
    history,
    finalScores: {
      A: playerAScore,
      B: playerBScore,
    },
    percentages: {
      A: {
        cooperate: playerACooperatePercent,
        defect: playerADefectPercent,
      },
      B: {
        cooperate: playerBCooperatePercent,
        defect: playerBDefectPercent,
      },
    },
  };
}

// 重置模拟显示
function resetSimulationDisplay() {
  // 重置总分显示
  document.getElementById("playerAScore").textContent = "0";
  document.getElementById("playerBScore").textContent = "0";
  document.getElementById("winner").textContent = "-";

  // 重置策略显示
  document.getElementById("playerAStrategyDisplay").textContent = "-";
  document.getElementById("playerBStrategyDisplay").textContent = "-";
  document.getElementById("playerAStrategyDisplaySmall").textContent = "-";
  document.getElementById("playerBStrategyDisplaySmall").textContent = "-";

  // 重置当前回合显示
  document.getElementById("playerACurrentChoice").innerHTML = "-";
  document.getElementById("playerBCurrentChoice").innerHTML = "-";
  document.getElementById("playerACurrentScore").textContent = "+0";
  document.getElementById("playerBCurrentScore").textContent = "+0";
  document.getElementById("currentRoundNumber").textContent = "0";

  // 重置选择比例
  document.getElementById("playerACooperatePercent").textContent = "0%";
  document.getElementById("playerADefectPercent").textContent = "0%";
  document.getElementById("playerBCooperatePercent").textContent = "0%";
  document.getElementById("playerBDefectPercent").textContent = "0%";

  // 重置进度条
  document.getElementById("playerACooperateBar").style.width = "0%";
  document.getElementById("playerADefectBar").style.width = "0%";
  document.getElementById("playerBCooperateBar").style.width = "0%";
  document.getElementById("playerBDefectBar").style.width = "0%";

  // 清空历史表格
  document.getElementById("historyTableBody").innerHTML = "";

  // 重置图表
  resetChart();
}

// 显示模拟结果
function displayResults(results) {
  // 更新选择比例
  document.getElementById(
    "playerACooperatePercent"
  ).textContent = `${Math.round(results.percentages.A.cooperate)}%`;
  document.getElementById("playerADefectPercent").textContent = `${Math.round(
    results.percentages.A.defect
  )}%`;
  document.getElementById(
    "playerBCooperatePercent"
  ).textContent = `${Math.round(results.percentages.B.cooperate)}%`;
  document.getElementById("playerBDefectPercent").textContent = `${Math.round(
    results.percentages.B.defect
  )}%`;

  // 更新进度条
  document.getElementById(
    "playerACooperateBar"
  ).style.width = `${results.percentages.A.cooperate}%`;
  document.getElementById(
    "playerADefectBar"
  ).style.width = `${results.percentages.A.defect}%`;
  document.getElementById(
    "playerBCooperateBar"
  ).style.width = `${results.percentages.B.cooperate}%`;
  document.getElementById(
    "playerBDefectBar"
  ).style.width = `${results.percentages.B.defect}%`;

  // 设置总回合数
  document.getElementById("totalRounds").textContent = results.history.length;
}

// 生成历史表格
function generateHistoryTable(results) {
  const historyTableBody = document.getElementById("historyTableBody");
  historyTableBody.innerHTML = "";

  results.history.forEach((round) => {
    const row = document.createElement("tr");

    // 回合数
    const roundCell = document.createElement("td");
    roundCell.className = "px-6 py-4 whitespace-nowrap";
    roundCell.textContent = round.round;
    row.appendChild(roundCell);

    // 玩家A选择
    const choiceACell = document.createElement("td");
    choiceACell.className = "px-6 py-4 whitespace-nowrap";
    const choiceAIcon = document.createElement("span");
    if (round.choices[0] === "cooperate") {
      choiceAIcon.className = "text-green-500";
      choiceAIcon.innerHTML = '<i class="fas fa-handshake mr-2"></i>合作';
    } else {
      choiceAIcon.className = "text-red-500";
      choiceAIcon.innerHTML = '<i class="fas fa-thumbs-down mr-2"></i>背叛';
    }
    choiceACell.appendChild(choiceAIcon);
    row.appendChild(choiceACell);

    // 玩家B选择
    const choiceBCell = document.createElement("td");
    choiceBCell.className = "px-6 py-4 whitespace-nowrap";
    const choiceBIcon = document.createElement("span");
    if (round.choices[1] === "cooperate") {
      choiceBIcon.className = "text-green-500";
      choiceBIcon.innerHTML = '<i class="fas fa-handshake mr-2"></i>合作';
    } else {
      choiceBIcon.className = "text-red-500";
      choiceBIcon.innerHTML = '<i class="fas fa-thumbs-down mr-2"></i>背叛';
    }
    choiceBCell.appendChild(choiceBIcon);
    row.appendChild(choiceBCell);

    // 玩家A得分
    const scoreACell = document.createElement("td");
    scoreACell.className = "px-6 py-4 whitespace-nowrap";
    scoreACell.textContent = `+${round.scores[0]}`;
    if (round.scores[0] >= 3) {
      scoreACell.classList.add("text-green-600", "font-bold");
    } else if (round.scores[0] === 0) {
      scoreACell.classList.add("text-red-600", "font-bold");
    }
    row.appendChild(scoreACell);

    // 玩家B得分
    const scoreBCell = document.createElement("td");
    scoreBCell.className = "px-6 py-4 whitespace-nowrap";
    scoreBCell.textContent = `+${round.scores[1]}`;
    if (round.scores[1] >= 3) {
      scoreBCell.classList.add("text-green-600", "font-bold");
    } else if (round.scores[1] === 0) {
      scoreBCell.classList.add("text-red-600", "font-bold");
    }
    row.appendChild(scoreBCell);

    // 累计得分
    const cumulativeScoreCell = document.createElement("td");
    cumulativeScoreCell.className = "px-6 py-4 whitespace-nowrap font-bold";
    cumulativeScoreCell.textContent = `${round.cumulativeScores[0]} / ${round.cumulativeScores[1]}`;
    if (round.cumulativeScores[0] > round.cumulativeScores[1]) {
      cumulativeScoreCell.classList.add("text-indigo-600");
    } else if (round.cumulativeScores[0] < round.cumulativeScores[1]) {
      cumulativeScoreCell.classList.add("text-red-600");
    }
    row.appendChild(cumulativeScoreCell);

    historyTableBody.appendChild(row);
  });
}

// 动画显示每回合结果
function animateSimulation(results) {
  // 重置图表
  resetChart();

  // 当前回合元素
  const playerACurrentChoice = document.getElementById("playerACurrentChoice");
  const playerBCurrentChoice = document.getElementById("playerBCurrentChoice");
  const playerACurrentScore = document.getElementById("playerACurrentScore");
  const playerBCurrentScore = document.getElementById("playerBCurrentScore");
  const currentRoundNumber = document.getElementById("currentRoundNumber");
  const playerAScoreDisplay = document.getElementById("playerAScore");
  const playerBScoreDisplay = document.getElementById("playerBScore");
  const winnerDisplay = document.getElementById("winner");

  // 清空总分
  let currentPlayerAScore = 0;
  let currentPlayerBScore = 0;
  playerAScoreDisplay.textContent = "0";
  playerBScoreDisplay.textContent = "0";
  winnerDisplay.textContent = "-";

  // 逐回合动画显示
  let roundIndex = 0;
  const animationInterval = setInterval(() => {
    if (roundIndex >= results.history.length) {
      clearInterval(animationInterval);

      // 最后更新一次胜者
      updateWinner(currentPlayerAScore, currentPlayerBScore);
      return;
    }

    const round = results.history[roundIndex];

    // 更新当前回合显示
    currentRoundNumber.textContent = round.round;

    // 更新选择图标
    playerACurrentChoice.innerHTML =
      round.choices[0] === "cooperate"
        ? '<i class="fas fa-handshake text-green-500"></i>'
        : '<i class="fas fa-thumbs-down text-red-500"></i>';

    playerBCurrentChoice.innerHTML =
      round.choices[1] === "cooperate"
        ? '<i class="fas fa-handshake text-green-500"></i>'
        : '<i class="fas fa-thumbs-down text-red-500"></i>';

    // 更新当前得分
    playerACurrentScore.textContent = `+${round.scores[0]}`;
    playerBCurrentScore.textContent = `+${round.scores[1]}`;

    // 更新当前得分颜色
    playerACurrentScore.className =
      round.scores[0] >= 3
        ? "text-xl font-bold text-green-500"
        : "text-xl font-bold text-red-500";

    playerBCurrentScore.className =
      round.scores[1] >= 3
        ? "text-xl font-bold text-green-500"
        : "text-xl font-bold text-red-500";

    // 更新总分显示
    currentPlayerAScore += round.scores[0];
    currentPlayerBScore += round.scores[1];
    playerAScoreDisplay.textContent = currentPlayerAScore;
    playerBScoreDisplay.textContent = currentPlayerBScore;

    // 更新胜者
    updateWinner(currentPlayerAScore, currentPlayerBScore);

    // 添加得分到图表
    updateScoreChart(round);

    // 高亮当前行
    highlightCurrentRow(round.round);

    roundIndex++;
  }, 500); // 每0.5秒显示一回合
}

// 更新胜者显示
function updateWinner(playerAScore, playerBScore) {
  const winnerDisplay = document.getElementById("winner");

  if (playerAScore > playerBScore) {
    winnerDisplay.textContent = "玩家 A";
    winnerDisplay.className = "text-sm font-bold text-indigo-600";
  } else if (playerBScore > playerAScore) {
    winnerDisplay.textContent = "玩家 B";
    winnerDisplay.className = "text-sm font-bold text-red-600";
  } else {
    winnerDisplay.textContent = "平局";
    winnerDisplay.className = "text-sm font-bold";
  }
}

// 高亮当前行
function highlightCurrentRow(roundNumber) {
  const historyTableBody = document.getElementById("historyTableBody");
  const rows = historyTableBody.querySelectorAll("tr");

  // 先移除所有高亮
  rows.forEach((row) => {
    row.classList.remove("bg-indigo-50");
  });

  // 当前回合高亮
  if (rows.length >= roundNumber) {
    rows[roundNumber - 1].classList.add("bg-indigo-50");

    // 移除自动滚动逻辑，让用户可以自由控制滚动位置
    // rows[roundNumber - 1].scrollIntoView({
    //   behavior: "smooth",
    //   block: "center",
    // });
  }
}

// 重置图表
function resetChart() {
  // 重置得分图表
  scoreChart.data.labels = [];
  scoreChart.data.datasets[0].data = [];
  scoreChart.data.datasets[1].data = [];
  scoreChart.update();
}

// 更新得分图表
function updateScoreChart(round) {
  // 添加标签
  scoreChart.data.labels.push(round.round);

  // 添加累计得分数据
  scoreChart.data.datasets[0].data.push(round.cumulativeScores[0]);
  scoreChart.data.datasets[1].data.push(round.cumulativeScores[1]);

  // 更新图表
  scoreChart.update();
}
