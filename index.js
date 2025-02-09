const axios = require('axios');
const fs = require('fs');
const figlet = require('figlet');
const chalk = require('chalk');
const readlineInterface = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

// Fungsi delay (sleep) selama ms milidetik
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Hanya menggunakan agent Sherlock
const agents = {
  "deployment_SoFftlsf9z4fyA3QCHYkaANq": "Sherlock 🔎"
};

function displayAppTitle() {
  console.log(chalk.cyan(figlet.textSync(' Kite AI ', { horizontalLayout: 'full' })));
  console.log(chalk.dim('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.gray('By Mamangzed'));
  console.log(chalk.dim('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
}

/**
 * Mengirim pertanyaan secara acak ke endpoint agent.
 * Jika proxyConfig diberikan, maka akan digunakan pada request axios.
 */
async function sendRandomQuestion(agent, proxyConfig) {
  try {
    const randomQuestions = JSON.parse(fs.readFileSync('random_questions.json', 'utf-8'));
    const randomQuestion = randomQuestions[Math.floor(Math.random() * randomQuestions.length)];

    const payload = { message: randomQuestion, stream: false };

    // Siapkan konfigurasi axios, termasuk header dan proxy (jika tersedia)
    const config = {
      headers: { 'Content-Type': 'application/json' },
      ...(proxyConfig ? { proxy: proxyConfig } : {})
    };

    const url = `https://${agent.toLowerCase().replace('_', '-')}.stag-vxzy.zettablock.com/main`;
    const response = await axios.post(url, payload, config);

    return { question: randomQuestion, response: response.data.choices[0].message };
  } catch (error) {
    console.error(chalk.red('⚠️ Error:'), error.response ? error.response.data : error.message);
  }
}

/**
 * Melaporkan penggunaan melalui API report_usage.
 * Jika proxyConfig diberikan, maka akan digunakan pada request axios.
 */
async function reportUsage(wallet, options, proxyConfig) {
  try {
    const payload = {
      wallet_address: wallet,
      agent_id: options.agent_id,
      request_text: options.question,
      response_text: options.response,
      request_metadata: {}
    };

    const config = {
      headers: { 'Content-Type': 'application/json' },
      ...(proxyConfig ? { proxy: proxyConfig } : {})
    };

    await axios.post(
      `https://quests-usage-dev.prod.zettablock.com/api/report_usage`,
      payload,
      config
    );

    console.log(chalk.green('✅ Data penggunaan berhasil dilaporkan!\n'));
  } catch (error) {
    console.error(chalk.red('⚠️ Gagal melaporkan penggunaan:'), error.response ? error.response.data : error.message);
  }
}

/**
 * Memproses setiap wallet sesuai jumlah iterasi yang diberikan.
 * Fungsi ini hanya menggunakan agent Sherlock.
 */
async function runMultiAccountProcess(wallets, iterations, proxyConfig) {
  // Karena hanya ada satu agent (Sherlock), ambil agent tersebut
  const agentId = Object.keys(agents)[0];
  const agentName = agents[agentId];

  for (const wallet of wallets) {
    console.log(chalk.blue(`\n📌 Memproses wallet: ${wallet}`));
    console.log(chalk.magenta(`🤖 Menggunakan Agent: ${agentName}`));
    console.log(chalk.dim('----------------------------------------'));

    for (let i = 0; i < iterations; i++) {
      console.log(chalk.yellow(`🔄 Iterasi ke-${i + 1} untuk wallet ${wallet}`));
      const nanya = await sendRandomQuestion(agentId, proxyConfig);
      console.log(chalk.cyan('❓ Pertanyaan:'), chalk.bold(nanya.question));
      console.log(chalk.green('💡 Jawaban:'), chalk.italic(nanya?.response?.content ?? ''));

      await reportUsage(wallet.toLowerCase(), {
        agent_id: agentId,
        question: nanya.question,
        response: nanya?.response?.content ?? 'Tidak ada jawaban'
      }, proxyConfig);

      // Menambahkan jeda selama 1 menit (60000 ms) antara setiap pertanyaan
      console.log(chalk.gray('⏳ Menunggu 1 menit sebelum iterasi berikutnya...'));
      await sleep(60000);
    }
    console.log(chalk.dim('----------------------------------------'));
  }
}

/**
 * Fungsi utama yang menangani input user dan melakukan auto looping setiap 24 jam.
 * Selain itu, mendukung input proxy URL (opsional).
 */
async function mainLoop() {
  displayAppTitle();

  // Minta input wallet addresses (support multiaccount, pisahkan dengan koma)
  readlineInterface.question(
    chalk.yellow('🔑 Masukkan wallet addresses Anda (pisahkan dengan koma): '),
    async (walletInput) => {
      // Memisahkan input berdasarkan koma dan menghapus spasi berlebih
      const wallets = walletInput.split(',').map(w => w.trim()).filter(w => w !== '');
      if (wallets.length === 0) {
        console.log(chalk.red('Tidak ada wallet address yang valid. Program dihentikan.'));
        readlineInterface.close();
        return;
      }

      // Minta input proxy URL (opsional)
      readlineInterface.question(
        chalk.yellow('🌐 Masukkan proxy URL (opsional, kosongkan jika tidak ingin menggunakan proxy): '),
        async (proxyInput) => {
          let globalProxyConfig = null;
          if (proxyInput.trim() !== "") {
            try {
              const proxyUrl = new URL(proxyInput.trim());
              globalProxyConfig = {
                protocol: proxyUrl.protocol.replace(':', ''),
                host: proxyUrl.hostname,
                port: parseInt(proxyUrl.port),
                auth: {
                  username: proxyUrl.username,
                  password: proxyUrl.password
                }
              };
            } catch (err) {
              console.error(chalk.red("⚠️ Proxy URL tidak valid. Proxy akan diabaikan."));
            }
          }

          // Minta input jumlah iterasi untuk agent Sherlock
          readlineInterface.question(
            chalk.yellow('🔢 Masukkan jumlah iterasi untuk agent Sherlock: '),
            async (input) => {
              const iterations = parseInt(input) || 1;
              console.log(chalk.blue(`\n📊 Wallet addresses: ${wallets.join(', ')}`));
              console.log(chalk.blue(`📊 Iterasi per wallet: ${iterations}\n`));

              // Looping tak terbatas: proses diulang setiap 24 jam
              while (true) {
                console.log(chalk.magenta('\n=== Memulai sesi baru untuk semua akun ===\n'));
                await runMultiAccountProcess(wallets, iterations, globalProxyConfig);
                console.log(chalk.yellow('\n⏳ Sesi selesai. Menunggu 24 jam sebelum memulai sesi baru...\n'));
                await sleep(24 * 60 * 60 * 1000); // Menunggu 24 jam
              }
            }
          );
        }
      );
    }
  );
}

mainLoop();
