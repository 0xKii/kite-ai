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

async function sendRandomQuestion(agent) {
  try {
    const randomQuestions = JSON.parse(fs.readFileSync('random_questions.json', 'utf-8'));
    const randomQuestion = randomQuestions[Math.floor(Math.random() * randomQuestions.length)];
    const payload = { message: randomQuestion, stream: false };
    
    const url = `https://${agent.toLowerCase().replace('_', '-')}.stag-vxzy.zettablock.com/main`;
    const response = await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' } });
    return { question: randomQuestion, response: response.data.choices[0].message };
  } catch (error) {
    console.error(chalk.red('⚠️ Error:'), error.response ? error.response.data : error.message);
    return null;
  }
}

async function reportUsage(wallet, options) {
  try {
    const payload = {
      wallet_address: wallet,
      agent_id: options.agent_id,
      request_text: options.question,
      response_text: options.response,
      request_metadata: {}
    };
    
    await axios.post(
      `https://quests-usage-dev.prod.zettablock.com/api/report_usage`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );
    console.log(chalk.green('✅ Data penggunaan berhasil dilaporkan!'));
  } catch (error) {
    console.error(chalk.red('⚠️ Gagal melaporkan penggunaan:'), error.response ? error.response.data : error.message);
  }
}

async function runMultiAccountProcess(wallets, iterations) {
  const agentId = Object.keys(agents)[0];
  const agentName = agents[agentId];
  
  for (const wallet of wallets) {
    console.log(chalk.blue(`\n📌 Memproses wallet: ${wallet}`));
    console.log(chalk.magenta(`🤖 Menggunakan Agent: ${agentName}`));
    console.log(chalk.dim('----------------------------------------'));

    for (let i = 0; i < iterations; i++) {
      console.log(chalk.yellow(`🔄 Iterasi ke-${i + 1} untuk wallet ${wallet}`));
      const nanya = await sendRandomQuestion(agentId);
      if (nanya) {
        console.log(chalk.cyan('❓ Pertanyaan:'), chalk.bold(nanya.question));
        console.log(chalk.green('💡 Jawaban:'), chalk.italic(nanya?.response?.content ?? ''));
        await reportUsage(wallet.toLowerCase(), {
          agent_id: agentId,
          question: nanya.question,
          response: nanya?.response?.content ?? 'Tidak ada jawaban'
        });
      }
      console.log(chalk.gray('⏳ Menunggu 1 menit sebelum iterasi berikutnya...'));
      await sleep(60000);
    }
    console.log(chalk.dim('----------------------------------------'));
  }
}

async function main() {
  displayAppTitle();
  
  const wallets = ['wallet1', 'wallet2']; // Ganti dengan wallet yang sesuai
  const iterations = 2; // Ganti dengan jumlah iterasi yang diinginkan
  
  while (true) {
    console.log(chalk.magenta('\n=== Memulai sesi baru untuk semua akun ===\n'));
    await runMultiAccountProcess(wallets, iterations);
    console.log(chalk.yellow('\n⏳ Sesi selesai. Menunggu 24 jam sebelum memulai sesi baru...\n'));
    await sleep(24 * 60 * 60 * 1000);
  }
}

main().catch(error => console.error(chalk.red('Error:'), error));
