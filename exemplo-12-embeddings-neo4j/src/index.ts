import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/huggingface_transformers';
import { CONFIG } from './config.ts';
import { DocumentProcessor } from './documentProcessor.ts';
import { type PretrainedModelOptions } from '@huggingface/transformers';
import { Neo4jVectorStore } from '@langchain/community/vectorstores/neo4j_vector';
import { displayResults } from './util.ts';

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
		'O que são tensores e como são representados em JavaScript?',
		'Como converter objetos JavaScript em tensores?',
		'O que é normalização de dados e por que é necessária?',
    "Como funciona uma rede neural no TensorFlow.js?",
		'O que significa treinar uma rede neural?',
	];

	for (const question of questions) {
		console.log(`\n${'='.repeat(80)}`);
		console.log(`❓ Pergunta: "${question}"`);
		console.log('='.repeat(80));

		const results = await _neo4jVectorStore.similaritySearch(
			question,
			CONFIG.similarity.topK,
		);
		displayResults(results);
	}

	// Cleanup
	console.log(`\n${'='.repeat(80)}`);
	console.log('Processamento concluído com sucesso!\n');
} catch (error) {
	console.error('Erro ao processar documentos:', error);
} finally {
	await _neo4jVectorStore?.close();
}
