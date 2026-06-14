import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import type { TextSplitterConfig } from './config.ts';

export class DocumentProcessor {
	private pdfPath: string;
	private textSplitterConfig: TextSplitterConfig;

	constructor(pdfPath: string, textSplitterConfig: TextSplitterConfig) {
		this.pdfPath = pdfPath;
		this.textSplitterConfig = textSplitterConfig;
	}

	async loadAndSplit() {
		const loader = new PDFLoader(this.pdfPath);
		const rawDocuments = await loader.load();
		console.log(
			`📄 PDF carregado: ${rawDocuments.length} páginas encontradas.`,
		);

		const splitter = new RecursiveCharacterTextSplitter(
			this.textSplitterConfig,
		);
		const documents = await splitter.splitDocuments(rawDocuments);
		console.log(`✂️ Documentos divididos: ${documents.length} chunks criados.`);

		return documents.map((doc) => ({
			...doc,
			metadata: {
				source: doc.metadata.source,
			},
		}));
	}
}
