from unittest.mock import patch


def test_get_client_disables_proxy_environment():
    from app.engine.rag import retriever

    retriever._client = None

    with patch("app.engine.rag.retriever.AsyncQdrantClient") as mock_client:
        sentinel = object()
        mock_client.return_value = sentinel

        client = retriever._get_client()

    assert client is sentinel
    mock_client.assert_called_once_with(
        url=retriever.settings.qdrant_url,
        timeout=30,
        proxy=None,
        trust_env=False,
    )

    retriever._client = None
