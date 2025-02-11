import axios from 'axios';
import fs from 'fs';
import figlet from 'figlet';
import chalk from 'chalk';
import boxen from 'boxen';
import { Twisters } from 'twisters';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import HttpsProxyAgent from 'https-proxy-agent';

marked.setOptions({
  renderer: new TerminalRenderer()
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const spinner = new Twisters(); 

const agents = {
  "deployment_SoFftlsf9z4fyA3QCHYkaANq": "Sherlock 🔎"
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function displayAppTitle() {
  console.log('\n' + boxen(
    chalk.cyan(figlet.textSync(' Kite AI ', { horizontalLayout: 'full' })) +
    '\n' + chalk.dim('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━') +
    '\n' + chalk.gray('By Mamangzed') +
    '\n' + chalk.dim('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'cyan',
      float: 'center'
    }
  ));
}

function loadWalletsAndProxies() {
  try {
    const wallets = JSON.parse(fs.readFileSync('wallets.json', 'utf-8'));
    const proxies = JSON.parse(fs.readFileSync('proxies.json', 'utf-8'));
    return { wallets, proxies };
  } catch (error) {
    console.error(chalk.red('⚠️ Gagal membaca file wallets.json atau proxies.json'), error.message);
    process.exit(1);
  }
}

async function sendRandomQuestion(agent, proxy) {
  try {
    const randomQuestions = JSON.parse(fs.readFileSync('random_questions.json', 'utf-8'));
    const randomQuestion = randomQuestions[Math.floor(Math.random() * randomQuestions.length)];
    const payload = { message: randomQuestion, stream: false };
    const url = `https://${agent.toLowerCase().replace('_', '-')}.stag-vxzy.zettablock.com/main`;
    
    const agentConfig = proxy ? { httpsAgent: new HttpsProxyAgent(`http://${proxy}`) } : {};
    
    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      ...agentConfig
    });
    
    return { question: randomQuestion, response: response.data.choices[0].message };
  } catch (error) {
    console.error(chalk.red('⚠️ Error:'), error.response ? error.response.data : error.message);
    return null;
  }
}

async function reportUsage(wallet, options, proxy) {
  try {
    const payload = {
      wallet_address: wallet,
      agent_id: options.agent_id,
      request_text: options.question,
      response_text: options.response,
      request_metadata: {}
    };
    
    const agentConfig = proxy ? { httpsAgent: new HttpsProxyAgent(`http://${proxy}`) } : {};
    
    await axios.post(
      `https://quests-usage-dev.prod.zettablock.com/api/report_usage`,
      payload,
      { headers: { 'Content-Type': 'application/json' }, ...agentConfig }
    );
    console.log(chalk.green('✅ Data penggunaan berhasil dilaporkan!'));
  } catch (error) {
    console.error(chalk.red('⚠️ Gagal melaporkan penggunaan:'), error.response ? error.response.data : error.message);
  }
}

async function runMultiAccountProcess(wallets, proxies, iterations) {
  const agentId = Object.keys(agents)[0];
  const agentName = agents[agentId];
  
  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];
    const proxy = proxies[i] || null;
    
    console.log(chalk.blue(`\n📌 Memproses wallet: ${wallet}`));
    console.log(chalk.magenta(`🤖 Menggunakan Agent: ${agentName}`));
    if (proxy) console.log(chalk.yellow(`🌐 Menggunakan Proxy: ${proxy}`));
    console.log(chalk.dim('----------------------------------------'));

    for (let j = 0; j < iterations; j++) {
      console.log(chalk.yellow(`🔄 Iterasi ke-${j + 1} untuk wallet ${wallet}`));
      const nanya = await sendRandomQuestion(agentId, proxy);
      if (nanya) {
        console.log(chalk.cyan('❓ Pertanyaan:'), chalk.bold(nanya.question));
        console.log(chalk.green('💡 Jawaban:'), chalk.italic(nanya?.response?.content ?? ''));
        await reportUsage(wallet.toLowerCase(), {
          agent_id: agentId,
          question: nanya.question,
          response: nanya?.response?.content ?? 'Tidak ada jawaban'
        }, proxy);
      }
      console.log(chalk.gray('⏳ Menunggu 1 menit sebelum iterasi berikutnya...'));
      await sleep(60000);
    }
    console.log(chalk.dim('----------------------------------------'));
  }
}

async function main() {
  displayAppTitle();
  
  const { wallets, proxies } = loadWalletsAndProxies();
  const iterations = 2; // Ganti dengan jumlah iterasi yang diinginkan
  
  while (true) {
    console.log(chalk.magenta('\n=== Memulai sesi baru untuk semua akun ===\n'));
    await runMultiAccountProcess(wallets, proxies, iterations);
    console.log(chalk.yellow('\n⏳ Sesi selesai. Menunggu 24 jam sebelum memulai sesi baru...\n'));
    await sleep(24 * 60 * 60 * 1000);
  }
}

main().catch(error => console.error(chalk.red('Error:'), error));
