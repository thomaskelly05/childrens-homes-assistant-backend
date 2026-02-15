import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma

CHROMA_DIR = "chroma_db"

def load_pdfs():
    pdf_files = [f for f in os.listdir() if f.endswith(".pdf")]
    docs = []

    for pdf in pdf_files:
        print(f"Loading: {pdf}")
        loader = PyPDFLoader(pdf)
        docs.extend(loader.load())

    return docs

def main():
    docs = load_pdfs()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1200,
        chunk_overlap=250
    )

    chunks = splitter.split_documents(docs)
    print(f"Total chunks created: {len(chunks)}")

    embeddings = OpenAIEmbeddings()

    vectordb = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        collection_name="children_home_docs",
        persist_directory=CHROMA_DIR
    )

    vectordb.persist()
    print("Done! Vector database rebuilt.")

if __name__ == "__main__":
    main()