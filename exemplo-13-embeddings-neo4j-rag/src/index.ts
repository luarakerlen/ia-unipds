import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/huggingface_transformers';
import { CONFIG } from './config.ts';
import { DocumentProcessor } from './documentProcessor.ts';
import { type PretrainedModelOptions } from '@huggingface/transformers';
import { Neo4jVectorStore } from '@langchain/community/vectorstores/neo4j_vector';
import { ChatOpenAI } from '@langchain/openai';
import { writeFile, mkdir } from 'node:fs/promises';
import { AI } from './ai.ts';

let _neo4jVectorStore = null;

async function clearAll(vectorStore: Neo4jVectorStore, nodeLabel: string) {
	console.log(`🧹 Removendo todos os documentos existentes.`);
	await vectorStore.query(`MATCH (n:\`${nodeLabel}\`) DETACH DELETE n`);
	console.log(`✅ Todos os documentos removidos.`);
}

try {
	console.log('🚀 Iniciando processamento de documentos...');
	const documentProcessor = new DocumentProcessor(
		CONFIG.pdf.path,
		CONFIG.textSplitter,
	);

	const documents = await documentProcessor.loadAndSplit();

	const embeddings = new HuggingFaceTransformersEmbeddings({
		model: CONFIG.embedding.modelName,
		pretrainedOptions: CONFIG.embedding
			.pretrainedOptions as PretrainedModelOptions,
	});

	const nlpModel = new ChatOpenAI({
		temperature: CONFIG.openRouter.temperature,
		maxRetries: CONFIG.openRouter.maxRetries,
		modelName: CONFIG.openRouter.nlpModel,
		openAIApiKey: CONFIG.openRouter.apiKey,
		configuration: {
			baseURL: CONFIG.openRouter.url,
			defaultHeaders: CONFIG.openRouter.defaultHeaders,
		},
	});

	// const response = await embeddings.embedQuery("Javascript")
	// const response = await embeddings.embedDocuments(["Javascript"])
	// console.log('🔍 Embedding gerado para a consulta "Javascript":', response);

	_neo4jVectorStore = await Neo4jVectorStore.fromExistingGraph(
		embeddings,
		CONFIG.neo4j,
	);

	await clearAll(_neo4jVectorStore, CONFIG.neo4j.nodeLabel);

	for (const [index, doc] of documents.entries()) {
		console.log(`📌 Processando chunk ${index + 1}/${documents.length}...`);
		await _neo4jVectorStore.addDocuments([doc]);
	}
	console.log('✅ Todos os documentos processados e armazenados com sucesso!');

	// ============== STEP 2: CONSULTA DE SIMILARIDADE ==============
	console.log('🔍 ETAPA 2: Executando busca por similaridade...\n');
	const questions = [
		// 'O que são tensores e como são representados em JavaScript?',
		// 'Como converter objetos JavaScript em tensores?',
		// 'O que é normalização de dados e por que é necessária?',
		// "Como funciona uma rede neural no TensorFlow.js?",
		// 'O que significa treinar uma rede neural?',
		// "O que é hot encoding e quando usar?",
		// "Quem é Madonna?"
	];

	const ai = new AI({
		nlpModel,
		debugLog: console.log,
		vectorStore: _neo4jVectorStore,
		promptConfig: CONFIG.promptConfig,
		templateText: CONFIG.templateText,
		topK: CONFIG.similarity.topK,
	});

	for (const index in questions) {
		const question = questions[index];
		console.log(`\n${'='.repeat(80)}`);
		console.log(`❓ Pergunta: "${question}"`);
		console.log('='.repeat(80));

		const result = await ai.answerQuestion(question!);

		if (result.error) {
			console.log(`❌ Erro: ${result.error}\n`);
			continue;
		}

		console.log(`✅ Resposta:\n${result.answer}\n`);
		await mkdir(CONFIG.output.answersFolder, { recursive: true });
		
		const fileFolder = `${CONFIG.output.answersFolder}`;
		const fileName = `${fileFolder}/${CONFIG.output.fileName}-${index}-${Date.now()}.md`;
		
		await writeFile(fileName, result.answer!, 'utf-8');
	}

	// Cleanup
	console.log(`\n${'='.repeat(80)}`);
	console.log('Processamento concluído com sucesso!\n');
} catch (error) {
	console.error('Erro ao processar documentos:', error);
} finally {
	await _neo4jVectorStore?.close();
}
