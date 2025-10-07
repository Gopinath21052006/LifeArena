// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// Global variables for PDF preview
let currentPdf = null;
let currentPage = 1;
let pageRendering = false;
let pageNumPending = null;
const scale = 1.5;

// Global variable for EPUB preview
let currentBook = null;

// Function to fetch books from JSON file
async function fetchBooks() {
    try {
        const response = await fetch('books.json');
        if (!response.ok) {
            throw new Error('Failed to load books data');
        }
        return await response.json();
    } catch (error) {
        console.error('Error loading books:', error);
        // Fallback to sample data if JSON file doesn't exist
        return [
            {
                title: "The Art of Creative Writing",
                author: "John Author",
                description: "A comprehensive guide to unlocking your creative potential and mastering the craft of writing.",
                cover: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
                file: "books/creative-writing.pdf",
                format: "pdf"
            },
            {
                title: "Digital Marketing Essentials",
                author: "John Author",
                description: "Learn the fundamental strategies and techniques for successful digital marketing campaigns.",
                cover: "https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
                file: "books/digital-marketing.epub",
                format: "epub"
            }
        ];
    }
}

// Function to render books
function renderBooks(books) {
    const booksContainer = document.getElementById('books-container');
    booksContainer.innerHTML = '';

    books.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.className = 'book-card';
        
        bookCard.innerHTML = `
            <div class="book-cover">
                <img src="${book.cover}" alt="${book.title}" onerror="this.src='https://images.unsplash.com/photo-1541963463532-d68292c34b19?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'">
            </div>
            <div class="book-info">
                <h3 class="book-title">${book.title}</h3>
                <p class="book-author">by ${book.author}</p>
                <p class="book-description">${book.description}</p>
                <div class="book-actions">
                    <a href="${book.file}" class="btn" download>Download</a>
                    <button class="btn btn-secondary preview-btn" data-book='${JSON.stringify(book).replace(/'/g, "&#39;")}'>Preview</button>
                </div>
            </div>
        `;
        
        booksContainer.appendChild(bookCard);
    });

    // Add event listeners to preview buttons
    document.querySelectorAll('.preview-btn').forEach(button => {
        button.addEventListener('click', function() {
            const bookData = JSON.parse(this.getAttribute('data-book').replace(/&#39;/g, "'"));
            openPreviewModal(bookData);
        });
    });
}

// PDF Preview Functions
function renderPage(pageNum, pdfDoc) {
    pageRendering = true;
    
    pdfDoc.getPage(pageNum).then(function(page) {
        const viewport = page.getViewport({ scale: scale });
        const canvas = document.getElementById('pdf-canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        
        const renderTask = page.render(renderContext);
        
        renderTask.promise.then(function() {
            pageRendering = false;
            
            if (pageNumPending !== null) {
                renderPage(pageNumPending, pdfDoc);
                pageNumPending = null;
            }
            
            document.getElementById('page-num').textContent = `Page: ${pageNum} of ${pdfDoc.numPages}`;
        });
    });
}

function queueRenderPage(pageNum, pdfDoc) {
    if (pageRendering) {
        pageNumPending = pageNum;
    } else {
        renderPage(pageNum, pdfDoc);
    }
}

function onPrevPage() {
    if (currentPage <= 1) {
        return;
    }
    currentPage--;
    queueRenderPage(currentPage, currentPdf);
}

function onNextPage() {
    if (currentPage >= currentPdf.numPages) {
        return;
    }
    currentPage++;
    queueRenderPage(currentPage, currentPdf);
}

// EPUB Preview Functions
function renderEpub(bookFile) {
    const viewer = document.getElementById('epub-viewer');
    viewer.innerHTML = '';
    
    // Initialize EPUB.js
    currentBook = ePub(bookFile);
    
    // Render the book in the viewer
    const rendition = currentBook.renderTo("epub-viewer", {
        width: "100%",
        height: "100%"
    });
    
    rendition.display();
    
    // Add navigation controls
    rendition.on("rendered", function(section) {
        // Add next/prev buttons
        const nav = document.createElement('div');
        nav.style.textAlign = 'center';
        nav.style.marginTop = '1rem';
        
        const prevBtn = document.createElement('button');
        prevBtn.textContent = 'Previous';
        prevBtn.className = 'btn';
        prevBtn.onclick = function() {
            rendition.prev();
        };
        
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Next';
        nextBtn.className = 'btn';
        nextBtn.onclick = function() {
            rendition.next();
        };
        
        nav.appendChild(prevBtn);
        nav.appendChild(nextBtn);
        
        viewer.parentNode.insertBefore(nav, viewer.nextSibling);
    });
}

// Modal functionality
const modal = document.getElementById('previewModal');
const closeModal = document.querySelector('.close-modal');

function openPreviewModal(book) {
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const pdfPreview = document.getElementById('pdf-preview');
    const epubPreview = document.getElementById('epub-preview');
    const noPreview = document.getElementById('no-preview');
    
    modalTitle.textContent = `Preview: ${book.title}`;
    
    // Hide all preview sections
    pdfPreview.style.display = 'none';
    epubPreview.style.display = 'none';
    noPreview.style.display = 'none';
    
    // Show appropriate preview based on file format
    if (book.format === 'pdf') {
        pdfPreview.style.display = 'block';
        
        // Load and render PDF
        pdfjsLib.getDocument(book.file).promise.then(function(pdfDoc) {
            currentPdf = pdfDoc;
            currentPage = 1;
            
            // Render the first page
            renderPage(currentPage, pdfDoc);
            
            // Set up navigation
            document.getElementById('prev-page').onclick = onPrevPage;
            document.getElementById('next-page').onclick = onNextPage;
        }).catch(function(error) {
            console.error('Error loading PDF:', error);
            noPreview.style.display = 'block';
            noPreview.innerHTML = `<p>Error loading PDF preview: ${error.message}</p>`;
        });
        
    } else if (book.format === 'epub') {
        epubPreview.style.display = 'block';
        
        // Load and render EPUB
        try {
            renderEpub(book.file);
        } catch (error) {
            console.error('Error loading EPUB:', error);
            noPreview.style.display = 'block';
            noPreview.innerHTML = `<p>Error loading EPUB preview: ${error.message}</p>`;
        }
        
    } else {
        noPreview.style.display = 'block';
        noPreview.innerHTML = `<p>Preview not available for ${book.format} files.</p>`;
    }
    
    modal.style.display = 'block';
}

function closePreviewModal() {
    modal.style.display = 'none';
    
    // Clean up resources
    if (currentBook) {
        currentBook.destroy();
        currentBook = null;
    }
    
    currentPdf = null;
    currentPage = 1;
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Load and render books
    fetchBooks().then(books => {
        renderBooks(books);
    });
    
    // Smooth scrolling for navigation links
    document.querySelectorAll('nav a').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            window.scrollTo({
                top: targetElement.offsetTop - 80,
                behavior: 'smooth'
            });
        });
    });
    
    // Modal event listeners
    closeModal.addEventListener('click', closePreviewModal);
    
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closePreviewModal();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closePreviewModal();
        }
    });
});