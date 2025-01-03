tinymce.init({
  license_key: 'gpl',
  selector: 'textarea.message-input',
  menubar: false,
  plugins: 'autoresize lists link emoticons',

  toolbar: [
    'bold italic underline | fontsize forecolor backcolor | link emoticons | bullist numlist',
  ],
  font_size_formats: '8pt 10pt 12pt 14pt 16pt 18pt 24pt 36pt',
  placeholder: 'Type a message...',
  height: 200,
  max_height: 500,
  autoresize_bottom_margin: 0,
  toolbar_location: 'top',
  statusbar: false,
  color_map: [
    '000000', 'Black',
    'FF0000', 'Red',
    '00FF00', 'Green',
    '0000FF', 'Blue',
    'FFFF00', 'Yellow',
    'FF00FF', 'Magenta',
    '00FFFF', 'Cyan',
  ],
  paste_data_images: false,
  paste_enable_default_filters: true,
  paste_block_drop: true,
});
